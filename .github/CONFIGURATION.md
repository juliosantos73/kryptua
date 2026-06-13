# Configuração do Repositório GitHub

Guia de referência para todos os **Secrets** e **Variables** necessários nos
GitHub Actions. Configura cada grupo quando chegares à etapa correspondente —
não precisas de tudo de uma vez.

Onde configurar: **Settings → Secrets and variables → Actions**

---

## Etapa 1 — CI básico (já funciona sem configuração)

Os workflows `ci-core-crypto`, `ci-relay`, `ci-web` e o job `build-apk` do
`ci-mobile` correm automaticamente em cada push, **sem nenhum secret ou
variável**. Geram artefactos (Wasm, APK debug, binário Go) disponíveis em
**Actions → run → Artifacts**.

Nada a configurar nesta etapa.

---

## Etapa 2 — Deploy do Relay Server na VPS

Ativa o workflow `deploy-relay.yml` para fazer deploy automático do servidor
de sincronização quando há alterações em `relay-server/`.

### Secrets necessários

| Nome | Descrição | Como obter |
|---|---|---|
| `VPS_HOST` | IP ou hostname da VPS | Painel do teu fornecedor (Hetzner, DigitalOcean, etc.) |
| `VPS_USER` | Utilizador SSH (ex: `root` ou `deploy`) | Definido na criação da VPS |
| `VPS_SSH_KEY` | Chave privada SSH (conteúdo do ficheiro `~/.ssh/id_ed25519`) | Ver instruções abaixo |

### Variable necessária

| Nome | Valor | Onde criar |
|---|---|---|
| `VPS_CONFIGURED` | `true` | Settings → Variables (aba separada dos Secrets) |

Enquanto `VPS_CONFIGURED` não existir ou não for `true`, os steps de deploy
são ignorados — o build continua a correr normalmente.

### Como gerar e configurar a chave SSH

```bash
# 1. Gerar par de chaves (se ainda não tens uma dedicada)
ssh-keygen -t ed25519 -C "github-actions-kryptua" -f ~/.ssh/kryptua_deploy

# 2. Copiar a chave pública para a VPS
ssh-copy-id -i ~/.ssh/kryptua_deploy.pub user@<VPS_IP>

# 3. Copiar o conteúdo da chave PRIVADA para o secret VPS_SSH_KEY
cat ~/.ssh/kryptua_deploy
```

Cola o conteúdo completo (incluindo `-----BEGIN...` e `-----END...`) no secret
`VPS_SSH_KEY`.

### Serviço systemd na VPS (configuração única)

```ini
# /etc/systemd/system/kryptua-relay.service
[Unit]
Description=Kryptua Relay Server
After=network.target

[Service]
ExecStart=/opt/kryptua/kryptua-relay
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable kryptua-relay
```

---

## Etapa 3 — Build de release Android (AAB para Play Store)

Ativa o job `build-aab` do `ci-mobile.yml` para gerar um AAB assinado,
pronto para submeter à Play Store.

### O que é o Keystore

Ficheiro de assinatura digital obrigatório para publicar na Play Store.
**Guarda-o em local seguro** — se o perderes não consegues atualizar a app.

### Como criar o Keystore

```bash
# Gerar o keystore (executar uma vez, guardar o ficheiro resultante)
keytool -genkey -v \
  -keystore kryptua-release.keystore \
  -alias kryptua \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Será pedido: nome, organização, cidade, país e duas passwords:
- **Store password** → guarda como `KEYSTORE_PASSWORD`
- **Key password** → guarda como `KEY_PASSWORD`

### Configurar no GitHub

```bash
# Converter o keystore para Base64 (para colar no secret)
base64 -w 0 kryptua-release.keystore
```

#### Secrets necessários

| Nome | Descrição |
|---|---|
| `KEYSTORE_BASE64` | Conteúdo do comando `base64 -w 0 kryptua-release.keystore` |
| `KEYSTORE_PASSWORD` | Password do ficheiro keystore (store password) |
| `KEY_ALIAS` | Alias usado na criação — `kryptua` |
| `KEY_PASSWORD` | Password da chave (key password) |

#### Variable necessária

| Nome | Valor | Onde criar |
|---|---|---|
| `KEYSTORE_CONFIGURED` | `true` | Settings → Variables |

Enquanto `KEYSTORE_CONFIGURED` não for `true`, o job `build-aab` é ignorado.

### Backups do Keystore

Guarda o ficheiro `kryptua-release.keystore` e as passwords em:
- Gestor de passwords (Bitwarden, 1Password, etc.)
- Storage encriptado offline
- **Nunca** commitar no repositório

---

## Resumo de todos os Secrets e Variables

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Nome | Etapa | Obrigatório para |
|---|---|---|
| `VPS_HOST` | 2 | Deploy relay na VPS |
| `VPS_USER` | 2 | Deploy relay na VPS |
| `VPS_SSH_KEY` | 2 | Deploy relay na VPS |
| `KEYSTORE_BASE64` | 3 | Build AAB release |
| `KEYSTORE_PASSWORD` | 3 | Build AAB release |
| `KEY_ALIAS` | 3 | Build AAB release |
| `KEY_PASSWORD` | 3 | Build AAB release |

### Variables (Settings → Secrets and variables → Actions → Variables)

| Nome | Valor | Etapa | Efeito quando definida |
|---|---|---|---|
| `VPS_CONFIGURED` | `true` | 2 | Ativa os steps de deploy SSH |
| `KEYSTORE_CONFIGURED` | `true` | 3 | Ativa o build e upload do AAB |
