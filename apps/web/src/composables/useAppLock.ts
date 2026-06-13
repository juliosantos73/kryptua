import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import { usePlatform } from './usePlatform'
import { useCryptoStore } from '@/stores/crypto'
import { useSyncStore } from '@/stores/sync'

// Tempo em background antes de bloquear automaticamente (ms).
// Alterar este valor para ajustar a janela de inactividade.
export const LOCK_AFTER_MS = 15_000

export function useAppLock() {
  const { isNative } = usePlatform()
  const cryptoStore = useCryptoStore()
  const syncStore = useSyncStore()
  const router = useRouter()
  let hiddenAt: number | null = null

  function triggerLockIfNeeded() {
    if (hiddenAt === null) return
    const elapsed = Date.now() - hiddenAt
    hiddenAt = null
    if (elapsed >= LOCK_AFTER_MS && cryptoStore.isUnlocked) {
      syncStore.destroy()
      cryptoStore.lock()
      router.replace({ name: 'unlock' })
    }
  }

  if (isNative.value) {
    // No Android/iOS o WebView pode suspender JS antes de visibilitychange disparar.
    // appStateChange usa o lifecycle nativo (onPause/onResume) via bridge Capacitor —
    // é o canal correcto para detecção de background em apps nativas.
    let listenerHandle: Awaited<ReturnType<typeof CapApp.addListener>> | null = null

    onMounted(async () => {
      listenerHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          hiddenAt = Date.now()
        } else {
          triggerLockIfNeeded()
        }
      })
    })

    onUnmounted(() => {
      listenerHandle?.remove()
    })
  } else {
    // No browser usa visibilitychange (fiável fora do WebView nativo)
    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else {
        triggerLockIfNeeded()
      }
    }

    onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))
    onUnmounted(() => document.removeEventListener('visibilitychange', handleVisibilityChange))
  }
}
