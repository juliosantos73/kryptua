<template>
  <div class="unlock-layout">
    <div class="unlock-card">
      <div class="logo">
        <span class="logo-icon">🔐</span>
        <h1>Kryptua</h1>
      </div>

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

        <p v-if="cryptoStore.error" class="error">{{ cryptoStore.error }}</p>

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

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()

const password = ref('')
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await dbStore.init()
  if (!dbStore.hasVault()) {
    router.replace({ name: 'setup' })
    return
  }
  inputRef.value?.focus()
})

async function handleUnlock() {
  loading.value = true
  try {
    const vault = dbStore.loadVault()
    if (!vault) { router.replace({ name: 'setup' }); return }

    await cryptoStore.unlock(password.value, vault.salt)
    router.push({ name: 'vault' })
  } finally {
    loading.value = false
  }
}

function goToSetup() {
  router.push({ name: 'setup' })
}
</script>

<style scoped>
.unlock-layout {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.unlock-card {
  width: 100%;
  max-width: 360px;
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
  margin-bottom: 0.75rem;
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

.btn-ghost:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
