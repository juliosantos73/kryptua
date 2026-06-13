# Kryptua — *A Criptografia é Tua*

Cofre digital local-first e zero-knowledge para passwords, cartões e notas seguras.  
Toda a encriptação acontece no dispositivo — o servidor de sincronização nunca vê dados em claro.

---

## Arquitectura do monorepo

```
kryptua/
├── core-crypto/          # Rust → WebAssembly (Argon2id + AES-256-GCM)
├── apps/
│   ├── web/              # Vue 3 + Vite (PWA + Capacitor host)
│   └── mobile/           # Capacitor 6 — wrapper Android
├── relay-server/         # Go 1.22 — relay WebSocket Yjs com persistência em disco
└── .github/workflows/    # CI/CD por camada (path-based triggers)
```

### Fluxo criptográfico

```
Master Password
      │  Argon2id (64 MiB, 3 iter, 4 threads)
      ▼
  Chave 256 bits  ──►  AES-256-GCM  ──►  Blob cifrado (nonce + ciphertext)
                                              │
                                         Yjs CRDT
                                              │
                               WebSocket (blobs opacos)
                                              │
                                       Go relay server
                                    (nunca vê texto-claro)
```

---

## Pré-requisitos

| Ferramenta | Versão mínima | Para que serve |
|---|---|---|
| Rust | stable (≥ 1.78) | compilar core-crypto |
| wasm-pack | 0.13+ | gerar pacote Wasm |
| Node.js | 22 LTS | apps/web e apps/mobile |
| Go | 1.22 | relay-server (opcional se usar Docker) |
| Docker + Compose | 24+ | relay em container (recomendado) |
| Java (JDK) | 17 ou 21 | build Android |
| Android SDK | API 34 | build APK/AAB |

### Instalar wasm-pack

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### Instalar Android SDK (sem Android Studio)

```bash
mkdir -p ~/android-sdk/cmdline-tools/latest
unzip commandlinetools-linux-*.zip -d ~/android-sdk/cmdline-tools/latest

export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
```

---

## Desenvolvimento local

### 1 — Compilar o core criptográfico (Rust → Wasm)

```bash
cd core-crypto
wasm-pack build --target bundler --release
# Output: core-crypto/pkg/  (referenciado por apps/web como "kryptua-core")
```

Testes nativos (sem browser):

```bash
cargo test
```

### 2 — App Web (Vue 3)

```bash
cd apps/web
npm install
npm run dev          # http://localhost:5173  (COOP/COEP activos)
```

> **Nota:** o servidor de desenvolvimento já envia os headers `Cross-Origin-Opener-Policy` e  
> `Cross-Origin-Embedder-Policy` necessários para o SharedArrayBuffer do Wasm funcionar.

Outros comandos:

```bash
npm run type-check   # vue-tsc sem emissão
npm run build        # type-check + vite build → apps/web/dist/
npm run preview      # prévia do build de produção
```

### 3 — Relay Server (Go)

#### Opção A — Docker (recomendado)

```bash
# Na raiz do monorepo
docker compose up --build
```

O relay fica disponível em `ws://localhost:8765/sync`.  
Health check: `GET http://localhost:8765/health`

```bash
docker compose down        # parar
docker compose logs -f relay   # ver logs
```

> O volume Docker `relay-data` persiste os updates Yjs em `/data/room-{vaultId}.bin`.
> O relay recarrega o histórico ao arrancar — clientes que se reconectem recebem
> todo o estado acumulado mesmo que o container tenha reiniciado.

#### Opção B — Go directo

```bash
cd relay-server
go run ./src/main.go          # escuta em :8080
PORT=9090 DATA_DIR=/tmp/relay go run ./src/main.go
```

#### Configurar a app web

```bash
# apps/web/.env.local
VITE_RELAY_URL=ws://localhost:8765/sync
```

Se a variável não estiver definida, o valor por defeito é `ws://localhost:8080/sync`.

### 4 — Android (APK debug)

```bash
# 1. Build do web (gera apps/web/dist/)
cd apps/web && npm run build && cd ../..

# 2. Inicializar projecto Android (apenas na primeira vez)
cd apps/mobile
npm install --ignore-scripts
npx cap add android           # gera apps/mobile/android/

# 3. Sincronizar assets web
npx cap sync android

# 4. Compilar APK
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Instalar no dispositivo via ADB:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
# reinstalar (mantém dados):
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Sincronização multi-dispositivo

### Como funciona

O relay é um **hub Yjs protocol-aware**: parseia o protocolo LEB128 do Yjs, acumula apenas updates reais (syncStep2 e syncUpdate), responde a pedidos de estado (syncStep1), e persiste tudo em disco. Os blobs transmitidos são sempre cifrados — o relay nunca interpreta o conteúdo.

```
Telemóvel (Android)            Relay (Docker)              Browser (Web)
───────────────────            ──────────────              ─────────────
VaultView.onMounted()                                    VaultView.onMounted()
        │                                                        │
        ├── WS connect ──────► /sync/{vaultId} ◄── WS connect ──┤
        │                           │                            │
        │   ◄── syncStep2 ×N ───────┤  (estado acumulado)        │
        │   ◄── syncStep2 ×N ───────────────────────────────────►│
        │                           │                            │
        │   ◄── syncStep1Request ───┤  (relay pede estado)       │
        │                           │◄── syncStep1Request ───────┤
        │                           │                            │
        ├── syncStep2 ──────────────►  (estado completo)         │
        │   (todos os items cifrados)│──── broadcast ────────────►│
        │                           │     Yjs apply              │
        │                           │     Vue re-renders         │
        │                           │                            │
        ├── addItem ────────────────►  (novo item)               │
        │   Yjs update cifrado      │──── broadcast ────────────►│
        │                           │     item aparece           │
```

**Keepalive:** o relay envia `msgQueryAwareness` (byte `0x03`) a cada 20 segundos para evitar o timeout de 30 s do y-websocket. Sem este mecanismo, a ligação é encerrada e o cliente reconecta em ciclo.

### Exportar e importar o vault (sincronização entre dispositivos)

Dois dispositivos precisam de partilhar o mesmo `vaultId` e `salt` para convergirem no mesmo CRDT. O processo é feito uma única vez:

#### No dispositivo de origem (telemóvel)

1. Abrir o vault desbloqueado
2. Ir a **Definições** (ícone ⚙ na barra lateral)
3. Secção **Sincronização** → botão **Exportar vault**
4. Aparece um QR code e um código de texto equivalente

O código exportado tem o formato:

```
base64( JSON({ v:1, id: "<vaultId>", salt: "<salt-base64>", name: "<nome>" }) )
```

**O código não contém a Master Password** — é apenas o identificador e o sal criptográfico público.

#### No dispositivo de destino (browser ou outro telemóvel)

1. Abrir a app (sem vault criado, ou criar um novo)
2. No ecrã de setup, escolher o separador **Importar Vault**
3. Apontar a câmara ao QR code **ou** colar o código de texto
4. Introduzir a **mesma Master Password** do dispositivo de origem
5. O vault é importado — a app conecta ao relay com o mesmo `vaultId`

Ao conectar, o relay entrega imediatamente todo o estado acumulado. Os itens aparecem após o Yjs aplicar os updates e o Vue re-renderizar.

```
Telemóvel                          Browser
─────────                          ───────
[Definições → Exportar]
        │
        ▼
   QR code  ──── câmara ────►  [Setup → Importar Vault]
   (vaultId + salt)                     │
                                        ▼
                               Master Password (mesma)
                                        │
                                        ▼
                               Derive mesma chave AES
                               Conecta ao relay com mesmo vaultId
                                        │
                                        ▼
                               Recebe updates → decifra → mostra itens
```

### Testar com dois tabs (sem Android)

Ambos os tabs partilham `localStorage` — portanto carregam o mesmo `vaultId` automaticamente.

1. `docker compose up --build`
2. `cd apps/web && npm run dev`
3. Abrir `http://localhost:5173` em dois tabs
4. Setup no Tab 1 → desbloquear
5. Tab 2 carrega o mesmo vault → desbloquear com a mesma password
6. Adicionar item num tab → aparece no outro em tempo real

### Preparar APK para aceder ao relay na rede local

O telemóvel não consegue aceder a `localhost` da máquina de desenvolvimento. Usa o IP local:

```bash
hostname -I | awk '{print $1}'   # ex: 192.168.1.74
```

Editar `apps/web/.env.local`:

```
VITE_RELAY_URL=ws://192.168.1.74:8765/sync
```

Depois rebuildar o APK:

```bash
cd apps/web && npm run build && cd ../..
cd apps/mobile && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> **Importante — Mixed Content no Android:** o Capacitor serve a app a partir de `https://localhost`.
> O Chromium bloqueia `ws://` (não cifrado) a partir de um contexto HTTPS como "Mixed Content".
> O `MainActivity.java` do projecto já configura `MIXED_CONTENT_ALWAYS_ALLOW` para desenvolvimento.
> Em produção, usa `wss://` e esta configuração deixa de ser necessária.

---

## Build de produção

### Web (para VPS ou CDN)

```bash
cd apps/web
npm run build
# Servir apps/web/dist/ com os headers COOP/COEP:
#   Cross-Origin-Opener-Policy: same-origin
#   Cross-Origin-Embedder-Policy: require-corp
```

Exemplo nginx:

```nginx
add_header Cross-Origin-Opener-Policy "same-origin";
add_header Cross-Origin-Embedder-Policy "require-corp";
```

### Relay Server (Linux ARM64)

```bash
cd relay-server
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 \
  go build -ldflags="-s -w" -o kryptua-relay ./src/
```

Systemd unit sugerida (`/etc/systemd/system/kryptua-relay.service`):

```ini
[Unit]
Description=Kryptua Relay Server
After=network.target

[Service]
ExecStart=/opt/kryptua/kryptua-relay
Restart=always
Environment=PORT=8080
Environment=DATA_DIR=/var/lib/kryptua/relay

[Install]
WantedBy=multi-user.target
```

> Em produção o relay deve ficar atrás de um proxy reverso com TLS (nginx/Caddy)
> para que os clientes se liguem via `wss://`.

### Android (AAB release — Google Play)

```bash
keytool -genkeypair -v -keystore kryptua-release.keystore \
  -alias kryptua -keyalg RSA -keysize 2048 -validity 10000

cd apps/mobile/android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=$(pwd)/kryptua-release.keystore \
  -Pandroid.injected.signing.store.password=KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=kryptua \
  -Pandroid.injected.signing.key.password=KEY_PASSWORD
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

---

## CI/CD (GitHub Actions)

| Workflow | Trigger | O que faz |
|---|---|---|
| `ci-core-crypto.yml` | `core-crypto/**` | `cargo test` + `wasm-pack build` |
| `ci-web.yml` | `apps/web/**`, `core-crypto/**` | Wasm → `vue-tsc` → `vite build` → artifact |
| `ci-relay.yml` | `relay-server/**` | `go test` + `go build` + cross-compile ARM64 |
| `ci-mobile.yml` | `apps/mobile/**`, `apps/web/**` | Wasm → web build → APK debug → artifact |
| `deploy-relay.yml` | push main em `relay-server/**` | Deploy SSH para VPS ARM64 |

### Secrets necessários

| Secret | Usado em | Descrição |
|---|---|---|
| `VPS_HOST` | `deploy-relay.yml` | IP ou hostname do VPS |
| `VPS_USER` | `deploy-relay.yml` | Utilizador SSH |
| `VPS_SSH_KEY` | `deploy-relay.yml` | Chave privada SSH (PEM) |
| `KEYSTORE_BASE64` | `ci-mobile.yml` | Keystore Android em base64 |
| `KEYSTORE_PASSWORD` | `ci-mobile.yml` | Password do keystore |
| `KEY_ALIAS` | `ci-mobile.yml` | Alias da chave |
| `KEY_PASSWORD` | `ci-mobile.yml` | Password da chave |

---

## Variáveis de ambiente

### apps/web

```bash
# apps/web/.env.local  (não commitar)
VITE_RELAY_URL=ws://localhost:8765/sync   # URL base do relay WebSocket
```

### relay-server

```bash
PORT=8080               # porta de escuta (default: 8080)
DATA_DIR=/data          # directório de persistência (default: /tmp/kryptua)
```

---

## Estrutura do código

```
core-crypto/src/
├── lib.rs          # ponto de entrada Wasm (exports públicos)
├── kdf.rs          # derive_key — Argon2id
├── crypto.rs       # encrypt / decrypt — AES-256-GCM
├── models.rs       # tipos: LoginPayload, CardPayload, NotePayload
└── vault.rs        # VaultManager — gestão de chave + encrypt/decrypt de items

apps/web/src/
├── stores/
│   ├── crypto.ts        # carregamento Wasm, derive_key, VaultManager
│   ├── db.ts            # persistência via @capacitor/preferences
│   └── sync.ts          # Yjs CRDT + y-websocket (relay)
├── composables/
│   ├── usePlatform.ts   # detecção Capacitor (isNative, isAndroid)
│   └── useBiometrics.ts # bridge nativo BiometricAuthNative
├── views/
│   ├── SetupView.vue    # criação de vault + importação via QR/código
│   ├── UnlockView.vue   # desbloqueio (password + biometria)
│   └── VaultView.vue    # ecrã principal (lista + detalhe + definições)
└── components/
    ├── ItemList.vue
    ├── ItemDetail.vue
    ├── AddItemModal.vue
    ├── Field.vue
    ├── QrScanner.vue      # câmara getUserMedia + jsQR, overlay fullscreen
    └── SettingsPanel.vue  # toggle biometria + exportação de vault (QR + código)

relay-server/src/
└── main.go         # hub de rooms Yjs-aware
                    #   · parseia LEB128 (msgSync/Step1/Step2/Update)
                    #   · acumula apenas updates reais em memória e disco
                    #   · responde a syncStep1 com estado acumulado
                    #   · envia syncStep1Request a novos clientes
                    #   · keepalive msgQueryAwareness a cada 20 s

apps/mobile/android/app/src/main/
├── AndroidManifest.xml          # INTERNET, CAMERA, usesCleartextTraffic
└── java/com/kryptua/vault/
    └── MainActivity.java        # MIXED_CONTENT_ALWAYS_ALLOW (ws:// em dev)
```

---

## Notas de segurança

- **Zero-knowledge:** a Master Password nunca sai do dispositivo. O relay recebe apenas blobs binários Yjs já cifrados com AES-256-GCM.
- **Argon2id:** derivação de chave com 64 MiB de memória, 3 iterações, 4 threads — resistente a ataques de GPU e ASIC.
- **Nonce único:** cada operação de encriptação gera um nonce aleatório de 12 bytes prefixado ao ciphertext.
- **Zeroize:** as chaves em memória são apagadas com zeros ao sair de âmbito (`ZeroizeOnDrop`).
- **Biometria Android:** a chave derivada é guardada em `EncryptedSharedPreferences` (backed por hardware) e só acedida após autenticação biométrica bem-sucedida.
- **Exportação de vault:** o código QR/texto contém apenas `vaultId` e `salt` — nunca a Master Password. Sem a password correcta é impossível decifrar qualquer item.
- **Sem recuperação:** se a Master Password for perdida, os dados são irrecuperáveis — informar o utilizador antes do setup.

---

## Decisões técnicas relevantes

| Decisão | Alternativa considerada | Razão |
|---|---|---|
| `@capacitor/preferences` para persistência | SQLite-Wasm (OPFS) | OPFS requer SharedArrayBuffer; WebView Android não envia COOP/COEP — dados perdiam-se ao reiniciar |
| Bridge nativo `window.Capacitor.Plugins.BiometricAuthNative` | Import npm do plugin | Import causava "Class extends value undefined" no bundle Vite (native.js não pode ser bundlado) |
| `wasm-pack --target bundler` | `--target web` | Target bundler integra com Vite nativamente via `vite-plugin-wasm`; target web requer `init()` manual |
| Yjs + y-websocket | Automerge | API mais simples, ecossistema mais maduro |
| Relay Yjs-aware (parseia protocolo) | Relay dumb (replay tudo) | Relay dumb acumula mensagens de protocolo (syncStep1, awareness) e reentrega-as a novos clientes causando erros; relay protocol-aware acumula apenas updates de dados |
| Persistência em disco no relay | Estado só em memória | Relay reiniciado sem persistência perde o histórico — novos clientes ficam sem dados até que outro cliente (com dados) se conecte |
| `syncStep1Request = [0,0,1,0]` | `[0,0,0]` (errado) | O state vector vazio em Yjs é `[0]` (1 byte, varint 0); `writeVarUint8Array([0])` = `[1,0]` (comprimento + dados); enviar `[0]` como state vector causava "Unexpected end of array" no cliente |
| Keepalive `msgQueryAwareness` (0x03) a cada 20 s | Sem keepalive | y-websocket encerra a ligação ao fim de 30 s sem mensagem de aplicação; WebSocket protocol pings não contam |
| `MIXED_CONTENT_ALWAYS_ALLOW` em `MainActivity.java` | Nada (ws:// bloqueado) | Capacitor serve de `https://localhost`; Chromium bloqueia `ws://` como Mixed Content mesmo com `android:usesCleartextTraffic="true"` — são mecanismos independentes |
| Exportação vault via QR code + código de texto | Cópia manual de UUID | QR elimina fricção no setup multi-dispositivo; código texto serve de fallback quando câmara não está disponível |
| `isNative` com leitura síncrona de `window.Capacitor` | `onMounted` ao nível de módulo | `onMounted` fora de componentes Vue 3 não regista hooks; Capacitor injeta o bridge antes de qualquer JS carregar |
