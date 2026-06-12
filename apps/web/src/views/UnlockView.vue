<template>
  <div class="unlock-layout">
    <div class="unlock-card">
      <div class="logo">
        <span class="logo-icon">🔐</span>
        <h1>Kryptua</h1>
      </div>

      <!-- Botão de biometria (só aparece no nativo com quick unlock configurado) -->
      <button
        v-if="hasBiometric"
        class="btn-biometric"
        :disabled="biometrics.isLoading.value"
        @click="handleBiometricUnlock"
      >
        <span class="bio-icon">👆</span>
        {{ biometrics.isLoading.value ? 'Autenticando...' : 'Usar Biometria' }}
      </button>

      <div v-if="hasBiometric" class="divider"><span>ou</span></div>

      <form @submit.prevent="handleUnlock">
        <div class="field">
          <label for="password">Master Password</label>
          <input
            id="password"
            ref="inputRef"
            v-model="password"
            type="password"
            placeholder="••••••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Desbloqueando...' : 'Desbloquear' }}
        </button>

        <button type="button" class="btn-ghost" @click="goToSetup">
          Criar novo vault
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useDbStore } from '@/stores/db'
import { usePlatform } from '@/composables/usePlatform'
import { useBiometrics } from '@/composables/useBiometrics'

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()
const { isNative } = usePlatform()
const biometrics = useBiometrics()

const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const hasBiometric = ref(false)

onMounted(async () => {
  await dbStore.init()
  if (!dbStore.hasVault()) { router.replace({ name: 'setup' }); return }

  if (isNative.value) {
    const available = await biometrics.checkAvailability()
    if (available) hasBiometric.value = await biometrics.hasQuickUnlock()
  }

  if (!hasBiometric.value) inputRef.value?.focus()
})

async function unlockWithKey(key: Uint8Array) {
  // Injeta a chave diretamente no store sem re-derivar (usado pela biometria)
  const { VaultManager } = await import('kryptua-core') as unknown as {
    VaultManager: new (key: Uint8Array) => { encrypt_item: (j: string) => Uint8Array; decrypt_item: (b: Uint8Array) => string }
  }
  const manager = new VaultManager(key)
  // Acessa o store diretamente para injetar o manager sem chamar derive_key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(cryptoStore as any).manager = manager
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(cryptoStore as any).isUnlocked = true
  router.push({ name: 'vault' })
}

async function handleBiometricUnlock() {
  const key = await biometrics.quickUnlock()
  if (!key) {
    errorMsg.value = biometrics.error.value ?? 'Biometria falhou'
    return
  }
  await unlockWithKey(key)
}

async function handleUnlock() {
  errorMsg.value = ''
  loading.value = true
  try {
    const vault = dbStore.loadVault()
    if (!vault) { router.replace({ name: 'setup' }); return }

    await cryptoStore.unlock(password.value, vault.salt)

    // Oferece configurar biometria após primeiro unlock com senha (nativo)
    if (isNative.value && !hasBiometric.value) {
      const available = await biometrics.checkAvailability()
      if (available) {
        // A chave está no manager — extraímos via encrypt de um payload de teste
        // O fluxo correto: o store expõe a chave como método interno
        // Para esta fase, registramos biometria de forma lazy após o unlock
        setupBiometricLazy()
      }
    }

    router.push({ name: 'vault' })
  } catch (e) {
    errorMsg.value = cryptoStore.error ?? (e instanceof Error ? e.message : 'Erro ao desbloquear')
  } finally {
    loading.value = false
  }
}

// Configura biometria em segundo plano após unlock com senha
async function setupBiometricLazy() {
  // Deriva novamente a chave para armazenar (único momento em que temos senha + salt)
  const vault = dbStore.loadVault()
  if (!vault) return
  try {
    const wasm = await import('kryptua-core') as unknown as { derive_key: (p: string, s: Uint8Array) => Uint8Array }
    const key = wasm.derive_key(password.value, vault.salt)
    await biometrics.setupQuickUnlock(key)
    hasBiometric.value = true
  } catch { /* silencioso — biometria é opcional */ }
}

function goToSetup() { router.push({ name: 'setup' }) }
</script>

<style scoped>
.unlock-layout {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 1rem;
}

.unlock-card {
  width: 100%;
  max-width: 360px;
  padding: 2.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.logo { text-align: center; margin-bottom: 2rem; }
.logo-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.logo h1 { font-size: 1.75rem; font-weight: 700; color: var(--color-accent); }

.btn-biometric {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.85rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 1rem;
  transition: border-color 0.15s;
}

.btn-biometric:hover:not(:disabled) { border-color: var(--color-accent); }
.btn-biometric:disabled { opacity: 0.6; cursor: not-allowed; }

.bio-icon { font-size: 1.25rem; }

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.field { margin-bottom: 1rem; }

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

input:focus { border-color: var(--color-accent); }

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
  margin-bottom: 0.75rem;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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

/* Mobile: usa toda a tela */
@media (max-width: 480px) {
  .unlock-card {
    padding: 2rem 1.5rem;
    border-radius: var(--radius);
    border: none;
    background: transparent;
  }
}
</style>
