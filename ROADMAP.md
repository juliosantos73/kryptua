# Kryptua — Roadmap

## Concluído

- [x] Crypto core Rust/Wasm (AES-256-GCM, Argon2id)
- [x] Setup e unlock flow (senha mestre → derivação de chave)
- [x] Vault local (SQLite + IndexedDB)
- [x] Sync via relay WebSocket (Yjs CRDTs — multi-dispositivo)
- [x] Tipos de item padrão: Login, Cartão, Nota
- [x] Tipos personalizados (criar / editar / reordenar / apagar)
- [x] Campos dinâmicos por tipo (text, password, pin, url, email, number, textarea)
- [x] View "Preferidas" (independente do tipo)
- [x] Preview visual de cartão físico (formulário + detalhe)
- [x] Layouts separados Desktop (3 colunas + atalhos de teclado) e Mobile (bottom-nav + FAB)
- [x] App Android via Capacitor (proteção de ecrã nativa)
- [x] CI/CD GitHub Actions (core, relay, web, mobile)
- [x] Documentação de secrets/variables por fase (.github/CONFIGURATION.md)

---

## Pendente

### Fase 1 — TOTP / Autenticador
- [ ] Geração de códigos TOTP (RFC 6238) dentro do cofre
- [ ] Associar segredo TOTP a um item Login existente
- [ ] Widget de código com countdown visual (30 s)
- [ ] Integração com Aurora365 (exposição de API de TOTP)

### Fase 2 — Extensão de browser
- [ ] Extensão Chrome/Firefox para auto-fill de logins
- [ ] Comunicação segura extensão ↔ cofre local (via relay ou WebSocket local)
- [ ] Deteção de URL e sugestão de credenciais

### Fase 3 — Publicação nas lojas
- [ ] Play Store: conta de developer (taxa única $25), release build assinado com keystore
- [ ] App Store / TestFlight: conta Apple Developer ($99/ano), configurar iOS no Capacitor
- [ ] macOS: build Electron ou Capacitor desktop

### Fase 4 — Importação / Exportação
- [ ] Importar de Bitwarden (JSON)
- [ ] Importar de 1Password (1PUX / CSV)
- [ ] Importar de LastPass (CSV)
- [ ] Exportar cofre completo (JSON cifrado + JSON em claro)

### Fase 5 — Partilha de cofre
- [ ] Múltiplos utilizadores no mesmo vault (CRDTs já suportam)
- [ ] Convite por link cifrado (chave pública do convidado)
- [ ] Permissões por item (leitura / edição)

### Fase 6 — Internacionalização (i18n)
- [ ] Configurar vue-i18n (ou similar)
- [ ] Extrair todas as strings da UI para ficheiros de tradução
- [ ] Português do Brasil (pt-BR) — língua base
- [ ] Português de Portugal (pt-PT)
- [ ] Espanhol (es)
- [ ] Inglês (en)
- [ ] Deteção automática do idioma do sistema
- [ ] Seletor de idioma nas Definições

### Fase 7 — Polimento e segurança
- [ ] Auditoria de segurança externa
- [ ] Timeout de sessão configurável (auto-lock após X minutos)
- [ ] Histórico de versões por item (rollback de edições)
- [ ] Modo de emergência (acesso de confiança para terceiro)
- [ ] PWA offline-first completa (service worker)
