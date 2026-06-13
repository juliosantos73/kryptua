<template>
  <div class="setup-layout">
    <!-- Prompt de ativação de biometria após criação do vault -->
    <div v-if="showBioPrompt" class="bio-prompt-overlay">
      <div class="bio-prompt-card">
        <span class="bio-icon-lg">👆</span>
        <h3>Ativar Quick Unlock?</h3>
        <p>Entre com biometria nas próximas sessões sem precisar digitar a Master Password.</p>
        <button class="btn-primary" :disabled="bioSetupLoading" @click="enableBiometrics">
          {{ bioSetupLoading ? 'Configurando...' : 'Ativar Biometria' }}
        </button>
        <button class="btn-ghost" :disabled="bioSetupLoading" @click="skipBiometrics">
          Agora não
        </button>
      </div>
    </div>

    <div class="setup-card">
      <div class="logo">
        <span class="logo-icon">🔐</span>
        <h1>Kryptua</h1>
        <p class="tagline">A Criptografia é Tua</p>
      </div>

      <!-- Tabs -->
      <div class="mode-tabs">
        <button :class="['mode-tab', { active: mode === 'create' }]" @click="mode = 'create'">
          Criar Vault
        </button>
        <button :class="['mode-tab', { active: mode === 'import' }]" @click="mode = 'import'">
          Importar Vault
        </button>
      </div>

      <!-- Criar vault -->
      <form v-if="mode === 'create'" @submit.prevent="handleSetup">
        <p class="hint">
          A Master Password nunca sai do dispositivo. Não é possível recuperá-la.
        </p>

        <div class="field">
          <label for="vault-name">Nome do Vault</label>
          <input
            id="vault-name"
            v-model="vaultName"
            type="text"
            placeholder="Meu Vault"
            autocomplete="off"
            required
          />
        </div>

        <div class="field">
          <div class="label-row">
            <label>Master Password</label>
            <button type="button" class="btn-generate" @click="password = generatePassword()">🎲 Gerar</button>
          </div>
          <PasswordInput
            v-model="password"
            placeholder="Mínimo 12 caracteres"
            autocomplete="new-password"
            required
            minlength="12"
          />
          <div v-if="password" class="strength-bar-wrap">
            <div class="strength-track">
              <div class="strength-bar" :style="{ width: setupStrength.pct + '%', background: setupStrength.color }" />
            </div>
            <span class="strength-label" :style="{ color: setupStrength.color }">{{ setupStrength.label }}</span>
          </div>
        </div>

        <div class="field">
          <label>Confirmar Password</label>
          <PasswordInput
            v-model="confirm"
            placeholder="Repita a password"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Criando vault...' : 'Criar Vault' }}
        </button>
      </form>

      <!-- Importar vault existente -->
      <div v-else>
        <!-- Scanner QR (fullscreen overlay) -->
        <QrScanner v-if="showScanner" @scan="onScan" @close="showScanner = false" />

        <form @submit.prevent="handleImport">
          <p class="hint">
            Scan o QR code de outro dispositivo, ou cola o código manualmente.
          </p>

          <button type="button" class="btn-scan" @click="showScanner = true">
            <span class="scan-icon">▣</span> Scan QR code
          </button>

          <div class="divider-or"><span>ou</span></div>

          <div class="field">
            <label for="import-code">Código do vault</label>
            <textarea
              id="import-code"
              ref="importCodeRef"
              v-model="importCode"
              class="import-code-area"
              placeholder="Cole o código aqui..."
              autocomplete="off"
              rows="3"
            />
          </div>

          <div class="field">
            <label>Master Password</label>
            <PasswordInput
              ref="importPasswordRef"
              v-model="importPassword"
              placeholder="A mesma password do dispositivo de origem"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="importError" class="error">{{ importError }}</p>

          <button type="submit" :disabled="importLoading || !importCode" class="btn-primary">
            {{ importLoading ? 'Importando...' : 'Importar e Desbloquear' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDbStore } from '@/stores/db'
import { useCryptoStore } from '@/stores/crypto'
import { usePlatform } from '@/composables/usePlatform'
import { useBiometrics } from '@/composables/useBiometrics'
import QrScanner from '@/components/QrScanner.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { generatePassword, passwordStrength } from '@/composables/usePasswordGenerator'

const router = useRouter()
const dbStore = useDbStore()
const cryptoStore = useCryptoStore()
const { isNative } = usePlatform()
const biometrics = useBiometrics()

const mode = ref<'create' | 'import'>('create')

// Criar vault
const vaultName = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')

const showBioPrompt = ref(false)
const bioSetupLoading = ref(false)
let pendingKey: Uint8Array | null = null

const setupStrength = computed(() => passwordStrength(password.value))

// Importar vault
const importCode = ref('')
const importPassword = ref('')
const importError = ref('')
const importLoading = ref(false)
const showScanner = ref(false)
const importPasswordRef = ref<{ focus: () => void } | null>(null)
const importCodeRef = ref<HTMLTextAreaElement | null>(null)

async function onScan(code: string) {
  showScanner.value = false
  importCode.value = code
  await nextTick()
  importPasswordRef.value?.focus()
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function handleImport() {
  importError.value = ''
  importLoading.value = true
  try {
    const data = JSON.parse(atob(importCode.value.trim()))
    if (data.v !== 1 || !data.id || !data.salt || !data.name) throw new Error('Código inválido')
    const salt = base64ToBytes(data.salt)
    // Verifica a password derivando a chave (lança exceção se falhar no Wasm)
    await cryptoStore.unlock(importPassword.value, salt)
    const now = Date.now()
    await dbStore.saveVault({ id: data.id, name: data.name, salt, createdAt: now, updatedAt: now })
    router.push({ name: 'vault' })
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Código inválido ou password incorreta'
  } finally {
    importLoading.value = false
  }
}

async function handleSetup() {
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = 'As passwords não coincidem.'
    return
  }

  loading.value = true
  try {
    const salt = crypto.getRandomValues(new Uint8Array(32))
    const id = crypto.randomUUID()
    const now = Date.now()

    await cryptoStore.unlock(password.value, salt)
    await dbStore.saveVault({ id, name: vaultName.value, salt, createdAt: now, updatedAt: now })

    // Oferece biometria se estiver no nativo e disponível
    if (isNative.value) {
      const available = await biometrics.checkAvailability()
      if (available) {
        const wasm = await import('kryptua-core') as unknown as { derive_key: (p: string, s: Uint8Array) => Uint8Array }
        pendingKey = wasm.derive_key(password.value, salt)
        password.value = ''
        confirm.value = ''
        showBioPrompt.value = true
        return // aguarda decisão
      }
    }

    router.push({ name: 'vault' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao criar vault'
  } finally {
    loading.value = false
  }
}

async function enableBiometrics() {
  if (!pendingKey) { await router.push({ name: 'vault' }); return }
  bioSetupLoading.value = true
  try {
    await biometrics.setupQuickUnlock(pendingKey)
  } catch { /* opcional */ } finally {
    pendingKey = null
    bioSetupLoading.value = false
    router.push({ name: 'vault' })
  }
}

function skipBiometrics() {
  pendingKey = null
  showBioPrompt.value = false
  router.push({ name: 'vault' })
}
</script>

<style scoped>
.setup-layout {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

/* Overlay de biometria (bottom sheet) */
.bio-prompt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.bio-prompt-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius) var(--radius);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bio-icon-lg {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.25rem;
}

.bio-prompt-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.bio-prompt-card p {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 0.25rem;
}

.setup-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.logo {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.logo h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: -0.5px;
}

.tagline {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}

input:focus {
  border-color: var(--color-accent);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.label-row label {
  margin-bottom: 0;
}

.btn-generate {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.btn-generate:hover { border-color: var(--color-accent); color: var(--color-accent); }

.strength-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.strength-track {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background 0.3s;
}

.strength-label {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.error {
  color: var(--color-danger);
  font-size: 0.82rem;
  margin-bottom: 1rem;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.5rem;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  width: 100%;
  padding: 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}

.btn-ghost:hover { border-color: var(--color-accent); color: var(--color-accent); }

.mode-tabs {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.mode-tab {
  flex: 1;
  padding: 0.6rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.mode-tab.active {
  background: var(--color-accent);
  color: #fff;
}

.btn-scan {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.8rem;
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius);
  color: var(--color-accent);
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.15s;
  margin-bottom: 0.75rem;
}
.btn-scan:hover { background: color-mix(in srgb, var(--color-accent) 20%, transparent); }

.scan-icon { font-size: 1.1rem; }

.divider-or {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}
.divider-or::before, .divider-or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.import-code-area {
  width: 100%;
  padding: 0.65rem 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.8rem;
  font-family: monospace;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
}

.import-code-area:focus { border-color: var(--color-accent); }

@media (max-width: 480px) {
  .bio-prompt-card {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  }
}
</style>
