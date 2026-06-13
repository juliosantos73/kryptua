import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useSyncStore } from '@/stores/sync'

// Tempo em background antes de bloquear automaticamente (ms)
const LOCK_AFTER_MS = 60_000

export function useAppLock() {
  const cryptoStore = useCryptoStore()
  const syncStore = useSyncStore()
  const router = useRouter()
  let hiddenAt: number | null = null

  function handleVisibilityChange() {
    if (document.hidden) {
      hiddenAt = Date.now()
      return
    }

    if (hiddenAt === null) return
    const elapsed = Date.now() - hiddenAt
    hiddenAt = null

    if (elapsed >= LOCK_AFTER_MS && cryptoStore.isUnlocked) {
      syncStore.destroy()
      cryptoStore.lock()
      router.replace({ name: 'unlock' })
    }
  }

  onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))
  onUnmounted(() => document.removeEventListener('visibilitychange', handleVisibilityChange))
}
