import { ref } from 'vue'
import { useDbStore } from '@/stores/db'
import { useSyncStore } from '@/stores/sync'
import type { VaultMeta } from '@/types/vault'

export function useVaultSession() {
  const dbStore = useDbStore()
  const syncStore = useSyncStore()
  const vault = ref<VaultMeta | null>(null)

  let persistTimer: ReturnType<typeof setTimeout> | null = null

  async function init(): Promise<boolean> {
    await dbStore.init()
    vault.value = await dbStore.loadVault()
    if (!vault.value) return false

    const savedState = await dbStore.loadYdocState(vault.value.id)
    syncStore.init(vault.value.id, savedState ?? undefined)

    syncStore.ydoc?.on('update', schedulePersist)
    return true
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(persistNow, 500)
  }

  async function persistNow() {
    const state = syncStore.getDocState()
    if (state && vault.value) await dbStore.saveYdocState(vault.value.id, state)
  }

  function cleanup() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = null
  }

  return { vault, init, persistNow, schedulePersist, cleanup }
}
