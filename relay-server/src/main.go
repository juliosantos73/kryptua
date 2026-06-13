package main

import (
	"encoding/binary"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ── Yjs protocol (LEB128 + sync message types) ────────────────────────────────

func parseVarUint(data []byte) (val uint64, n int) {
	var shift uint
	for i, b := range data {
		val |= uint64(b&0x7f) << shift
		if b < 0x80 {
			return val, i + 1
		}
		shift += 7
	}
	return 0, -1
}

func encodeVarUint(v uint64) []byte {
	buf := make([]byte, 0, 8)
	for {
		b := byte(v & 0x7f)
		v >>= 7
		if v != 0 {
			b |= 0x80
		}
		buf = append(buf, b)
		if v == 0 {
			break
		}
	}
	return buf
}

const (
	yjsMsgSync    = 0
	yjsSyncStep1  = 0
	yjsSyncStep2  = 1
	yjsSyncUpdate = 2
)

// syncStep1Request: relay envia ao cliente recém-ligado para forçar
// a entrega do estado completo.
// Formato: [msgSync=0][syncStep1=0][stateVectorLen=1][emptyStateVector=0]
// O Yjs codifica um state vector vazio como [0] (varint 0 entradas).
// writeVarUint8Array([0]) = [1, 0] (comprimento=1, dados=[0]).
// Sem este byte, Yjs tentaria ler varint de 0 bytes → "Unexpected end of array".
var syncStep1Request = []byte{yjsMsgSync, yjsSyncStep1, 1, 0}

func encodeSyncStep2(update []byte) []byte {
	msg := encodeVarUint(yjsMsgSync)
	msg = append(msg, encodeVarUint(yjsSyncStep2)...)
	msg = append(msg, encodeVarUint(uint64(len(update)))...)
	msg = append(msg, update...)
	return msg
}

// parseSyncMsg devolve (subtype, updatePayload, isSyncMsg).
func parseSyncMsg(msg []byte) (subtype uint64, payload []byte, ok bool) {
	t, n := parseVarUint(msg)
	if n <= 0 || t != yjsMsgSync {
		return 0, nil, false
	}
	sub, m := parseVarUint(msg[n:])
	if m <= 0 {
		return 0, nil, false
	}
	rest := msg[n+m:]
	if sub == yjsSyncStep1 {
		return sub, rest, true
	}
	length, l := parseVarUint(rest)
	if l <= 0 || int(length) > len(rest)-l {
		return sub, nil, true
	}
	return sub, rest[l : l+int(length)], true
}

// ── Persistência em disco ─────────────────────────────────────────────────────

func dataDir() string {
	if d := os.Getenv("DATA_DIR"); d != "" {
		return d
	}
	return "/tmp/kryptua"
}

func roomFile(roomID string) string {
	return filepath.Join(dataDir(), "room-"+roomID+".bin")
}

// Formato: [uint32 big-endian length][update bytes] × N
func loadUpdates(roomID string) [][]byte {
	f, err := os.Open(roomFile(roomID))
	if err != nil {
		return nil
	}
	defer f.Close()

	var updates [][]byte
	for {
		var length uint32
		if err := binary.Read(f, binary.BigEndian, &length); err != nil {
			break
		}
		u := make([]byte, length)
		if _, err := io.ReadFull(f, u); err != nil {
			break
		}
		updates = append(updates, u)
	}
	log.Printf("room=%s carregou %d updates do disco", roomID, len(updates))
	return updates
}

func persistUpdate(roomID string, update []byte) {
	if err := os.MkdirAll(dataDir(), 0755); err != nil {
		log.Printf("mkdir %s: %v", dataDir(), err)
		return
	}
	f, err := os.OpenFile(roomFile(roomID), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("persistUpdate room=%s: %v", roomID, err)
		return
	}
	defer f.Close()
	var buf [4]byte
	binary.BigEndian.PutUint32(buf[:], uint32(len(update)))
	f.Write(buf[:])
	f.Write(update)
}

// ── Room ──────────────────────────────────────────────────────────────────────

type room struct {
	id      string
	mu      sync.Mutex
	clients map[*client]struct{}
	updates [][]byte
}

func newRoom(id string) *room {
	return &room{
		id:      id,
		clients: make(map[*client]struct{}),
		updates: loadUpdates(id),
	}
}

func (r *room) join(c *client) {
	r.mu.Lock()
	r.clients[c] = struct{}{}
	snapshot := make([][]byte, len(r.updates))
	copy(snapshot, r.updates)
	r.mu.Unlock()

	// 1. Entrega estado acumulado
	for _, u := range snapshot {
		select {
		case c.send <- encodeSyncStep2(u):
		default:
		}
	}
	// 2. Pede estado completo ao cliente (garante acumulação mesmo offline)
	select {
	case c.send <- syncStep1Request:
	default:
	}
}

func (r *room) leave(c *client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, c)
}

func (r *room) handleMessage(sender *client, msg []byte) {
	subtype, payload, isSyncMsg := parseSyncMsg(msg)

	r.mu.Lock()
	isUpdate := isSyncMsg && (subtype == yjsSyncStep2 || subtype == yjsSyncUpdate) && len(payload) > 0
	if isUpdate {
		r.updates = append(r.updates, payload)
	}
	others := make([]*client, 0, len(r.clients))
	for c := range r.clients {
		if c != sender {
			others = append(others, c)
		}
	}
	var stateSnapshot [][]byte
	if isSyncMsg && subtype == yjsSyncStep1 {
		stateSnapshot = make([][]byte, len(r.updates))
		copy(stateSnapshot, r.updates)
	}
	r.mu.Unlock()

	// Persiste update em goroutine (não bloqueia o read pump)
	if isUpdate {
		go persistUpdate(r.id, payload)
	}

	// Responde a sync step 1 com estado acumulado
	for _, u := range stateSnapshot {
		select {
		case sender.send <- encodeSyncStep2(u):
		default:
		}
	}

	// Broadcast a outros clientes
	for _, c := range others {
		select {
		case c.send <- msg:
		default:
			log.Printf("buffer cheio, room=%s", r.id)
		}
	}
}

// ── Hub ───────────────────────────────────────────────────────────────────────

type hub struct {
	mu    sync.RWMutex
	rooms map[string]*room
}

var globalHub = &hub{rooms: make(map[string]*room)}

func (h *hub) getOrCreate(id string) *room {
	h.mu.Lock()
	defer h.mu.Unlock()
	if r, ok := h.rooms[id]; ok {
		return r
	}
	r := newRoom(id)
	h.rooms[id] = r
	return r
}

// ── Client ────────────────────────────────────────────────────────────────────

type client struct {
	conn *websocket.Conn
	send chan []byte
}

// msgQueryAwareness é um mensagem de aplicação que o y-websocket reconhece
// e que actualiza o seu wsLastMessageReceived. Sem ela, y-websocket fecha
// a ligação ao fim de 30 s sem mensagens → ciclo de reconexão constante.
// O cliente responde com awareness data (ignorada pelo relay).
var msgQueryAwareness = []byte{3}

func clientCount(rm *room) int {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	return len(rm.clients)
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	if roomID == "" {
		http.Error(w, "room id obrigatório", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade WebSocket: %v", err)
		return
	}

	c := &client{conn: conn, send: make(chan []byte, 512)}
	rm := globalHub.getOrCreate(roomID)
	rm.join(c)
	log.Printf("+ room=%s clientes=%d updates=%d", roomID, clientCount(rm), len(rm.updates))

	go func() {
		// 20 s < timeout de 30 s do y-websocket → mantém a ligação viva
		ticker := time.NewTicker(20 * time.Second)
		defer func() { ticker.Stop(); conn.Close() }()
		for {
			select {
			case msg, ok := <-c.send:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.BinaryMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				// Keepalive ao nível da aplicação — evita o timeout de 30 s do y-websocket
				if err := conn.WriteMessage(websocket.BinaryMessage, msgQueryAwareness); err != nil {
					return
				}
			}
		}
	}()

	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		rm.handleMessage(c, msg)
	}

	rm.leave(c)
	close(c.send)
	log.Printf("- room=%s clientes=%d", roomID, clientCount(rm))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("ok"))
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /sync/{room}", handleSync)

	addr := ":" + port
	log.Printf("kryptua relay ouvindo em %s | data=%s", addr, dataDir())
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
