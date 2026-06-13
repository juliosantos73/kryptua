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
├── relay-server/         # Go 1.22 — relay WebSocket para sincronização Yjs
└── .github/workflows/    # CI/CD por camada (path-based triggers)
```

### Fluxo de dados

```
Master Password
      │  Argon2id (64 MiB, 3 iter, 4 threads)
      ▼
  Chave 256 bits  ──►  AES-256-GCM  ──►  Blob cifrado
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
| Go | 1.22 | relay-server |
| Java (JDK) | 17 ou 21 | build Android |
| Android SDK | API 34 | build APK/AAB |

### Instalar wasm-pack

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### Instalar Android SDK (sem Android Studio)

```bash
# Descarregar command-line tools em developer.android.com/studio#command-tools
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

```bash
cd relay-server
go run ./src/main.go          # escuta em :8080

# ou com porta personalizada:
PORT=9090 go run ./src/main.go
```

Endpoint WebSocket: `ws://localhost:8080/sync/{vaultId}`  
Health check: `GET http://localhost:8080/health`

A app web liga ao relay via variável de ambiente:

```bash
# apps/web/.env.local
VITE_RELAY_URL=ws://localhost:8080/sync
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

# 3. Sincronizar assets
npx cap sync android

# 4. Compilar APK
cd android
./gradlew assembleDebug --no-daemon
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Instalar no dispositivo via ADB:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

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

[Install]
WantedBy=multi-user.target
```

### Android (AAB release — Google Play)

Requer keystore. Criar uma vez:

```bash
keytool -genkeypair -v -keystore kryptua-release.keystore \
  -alias kryptua -keyalg RSA -keysize 2048 -validity 10000
```

Build:

```bash
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

Cada camada tem o seu workflow com path-based triggers.

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

Sem os secrets de VPS, o deploy é ignorado. Sem os secrets de keystore, apenas o APK debug é gerado.

---

## Variáveis de ambiente

### apps/web

```bash
# apps/web/.env.local  (não commitar)
VITE_RELAY_URL=ws://localhost:8080/sync   # URL base do relay WebSocket
```

### relay-server

```bash
PORT=8080    # porta de escuta (default: 8080)
```

---

## Notas de segurança

- **Zero-knowledge:** a Master Password nunca sai do dispositivo. O relay recebe apenas blobs binários Yjs já cifrados com AES-256-GCM.
- **Argon2id:** derivação de chave com 64 MiB de memória, 3 iterações, 4 threads — resistente a ataques de GPU e ASIC.
- **Nonce único:** cada operação de encriptação gera um nonce aleatório de 12 bytes prefixado ao ciphertext.
- **Zeroize:** as chaves em memória são apagadas com zeros ao sair de âmbito (`ZeroizeOnDrop`).
- **Biometria Android:** a chave derivada é guardada em `EncryptedSharedPreferences` (backed por hardware) e só acedida após autenticação biométrica bem-sucedida.
- **Sem recuperação:** se a Master Password for perdida, os dados são irrecuperáveis — informar o utilizador antes do setup.

---

## Estrutura do código

```
core-crypto/src/
├── lib.rs          # ponto de entrada Wasm (exports públicos)
├── kdf.rs          # derive_key — Argon2id
├── crypto.rs       # encrypt / decrypt — AES-256-GCM
├── models.rs       # tipos: LoginPayload, CardPayload, NotePayload, Item, VaultMeta
└── vault.rs        # VaultManager — gestão de chave + encrypt/decrypt de items

apps/web/src/
├── stores/
│   ├── crypto.ts   # carregamento Wasm, derive_key, VaultManager
│   ├── db.ts       # persistência via @capacitor/preferences
│   └── sync.ts     # Yjs CRDT + y-websocket (relay)
├── composables/
│   ├── usePlatform.ts    # detecção Capacitor (isNative, isAndroid)
│   └── useBiometrics.ts  # bridge nativo BiometricAuthNative
├── views/
│   ├── SetupView.vue     # criação de vault (primeiro uso)
│   ├── UnlockView.vue    # desbloqueio (password + biometria)
│   └── VaultView.vue     # ecrã principal (lista + detalhe + definições)
└── components/
    ├── ItemList.vue
    ├── ItemDetail.vue
    ├── AddItemModal.vue
    ├── Field.vue
    └── SettingsPanel.vue  # toggle biometria + info vault

relay-server/src/
└── main.go         # hub de rooms Yjs, gorilla/websocket, ping/pong, histórico em memória
```

---

## Decisões técnicas relevantes

| Decisão | Alternativa considerada | Razão |
|---|---|---|
| `@capacitor/preferences` para persistência | SQLite-Wasm (OPFS) | OPFS requer SharedArrayBuffer; WebView Android não envia COOP/COEP — dados perdiam-se ao reiniciar |
| Bridge nativo `window.Capacitor.Plugins.BiometricAuthNative` | Import npm do plugin | Import causava "Class extends value undefined" no bundle Vite (native.js não pode ser bundlado) |
| `wasm-pack --target bundler` | `--target web` | Target bundler integra com Vite natively via `vite-plugin-wasm`; target web requer `init()` manual e causa erros de inicialização |
| Yjs + y-websocket | Automerge | API mais simples, ecossistema mais maduro, relay stateless possível |
| Relay Go dumb (sem lógica Yjs) | Relay com parsing Yjs | Zero-knowledge real: servidor nunca interpreta o conteúdo |
| `isNative` com leitura síncrona de `window.Capacitor` | `onMounted` ao nível de módulo | `onMounted` fora de componentes Vue 3 não regista hooks; Capacitor injeta o bridge antes de qualquer JS carregar |
