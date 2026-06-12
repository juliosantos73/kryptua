package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	// Em produção, restringir a origens conhecidas.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// room agrupa todos os clientes conectados a um mesmo vault e acumula o
// histórico de updates Yjs para entregar a novos clientes ao conectar.
type room struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
	history [][]byte // updates Yjs acumulados — entregues a novos clientes
}

func newRoom() *room {
	return &room{clients: make(map[*client]struct{})}
}

func (r *room) join(c *client) {
	r.mu.Lock()
	r.clients[c] = struct{}{}
	history := make([][]byte, len(r.history))
	copy(history, r.history)
	r.mu.Unlock()

	// Envia histórico ao cliente recém-conectado
	for _, msg := range history {
		select {
		case c.send <- msg:
		default:
		}
	}
}

func (r *room) leave(c *client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, c)
}

func (r *room) broadcast(sender *client, msg []byte) {
	r.mu.Lock()
	r.history = append(r.history, msg)
	clients := make([]*client, 0, len(r.clients))
	for c := range r.clients {
		if c != sender {
			clients = append(clients, c)
		}
	}
	r.mu.Unlock()

	for _, c := range clients {
		select {
		case c.send <- msg:
		default:
			log.Printf("buffer cheio para cliente, descartando mensagem")
		}
	}
}

// hub gerencia todas as rooms ativas.
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
	r := newRoom()
	h.rooms[id] = r
	return r
}

// client representa uma conexão WebSocket activa.
type client struct {
	conn *websocket.Conn
	send chan []byte
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

	log.Printf("cliente conectado → room=%s", roomID)

	// Write pump: envia mensagens da fila para a conexão
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer func() {
			ticker.Stop()
			conn.Close()
		}()
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
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Read pump: recebe mensagens e faz broadcast para a room
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
		rm.broadcast(c, msg)
	}

	rm.leave(c)
	close(c.send)
	log.Printf("cliente desconectado ← room=%s", roomID)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("ok"))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /sync/{room}", handleSync)

	addr := ":8080"
	log.Printf("kryptua relay-server ouvindo em %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
