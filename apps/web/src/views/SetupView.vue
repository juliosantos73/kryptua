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

      <form @submit.prevent="handleSetup">
        <h2>Criar Vault</h2>
        <p class="hint">
          Sua Master Password nunca sai do dispositivo. Não é possível recuperá-la.
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
          <label for="password">Master Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Mínimo 12 caracteres"
            autocomplete="new-password"
            required
            minlength="12"
          />
        </div>

        <div class="field">
          <label for="confirm">Confirmar Password</label>
          <input
            id="confirm"
            v-model="confirm"
            type="password"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDbStore } from '@/stores/db'
import { useCryptoStore } from '@/stores/crypto'
import { usePlatform } from '@/composables/usePlatform'
import { useBiometrics } from '@/composables/useBiometrics'

const router = useRouter()
const dbStore = useDbStore()
const cryptoStore = useCryptoStore()
const { isNative } = usePlatform()
const biometrics = useBiometrics()

const vaultName = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')

const showBioPrompt = ref(false)
const bioSetupLoading = ref(false)
let pendingKey: Uint8Array | null = null

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

@media (max-width: 480px) {
  .bio-prompt-card {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  }
}
</style>
