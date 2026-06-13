import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'
import type { VaultMeta } from '@/types/vault'

// Capacitor Preferences (EncryptedSharedPreferences no Android, localStorage no browser)
// Não precisa de OPFS/SharedArrayBuffer — persiste entre sessões em todas as plataformas.

const VAULT_KEY = 'kryptua_vault_meta'
const YDOC_KEY_PREFIX = 'kryptua_ydoc_'

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export const useDbStore = defineStore('db', () => {
  const isReady = ref(false)
  const error = ref<string | null>(null)

  async function init(): Promise<void> {
    if (isReady.value) return
    isReady.value = true
  }

  async function saveVault(vault: VaultMeta): Promise<void> {
    const payload = {
      id: vault.id,
      name: vault.name,
      salt: toBase64(vault.salt),
      verifyBlob: vault.verifyBlob ? toBase64(vault.verifyBlob) : undefined,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    }
    await Preferences.set({ key: VAULT_KEY, value: JSON.stringify(payload) })
  }

  async function loadVault(): Promise<VaultMeta | null> {
    const { value } = await Preferences.get({ key: VAULT_KEY })
    if (!value) return null
    const d = JSON.parse(value)
    return {
      id: d.id,
      name: d.name,
      salt: fromBase64(d.salt),
      verifyBlob: d.verifyBlob ? fromBase64(d.verifyBlob) : undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }
  }

  async function hasVault(): Promise<boolean> {
    return (await loadVault()) !== null
  }

  async function saveYdocState(vaultId: string, state: Uint8Array): Promise<void> {
    await Preferences.set({ key: YDOC_KEY_PREFIX + vaultId, value: toBase64(state) })
  }

  async function loadYdocState(vaultId: string): Promise<Uint8Array | null> {
    const { value } = await Preferences.get({ key: YDOC_KEY_PREFIX + vaultId })
    return value ? fromBase64(value) : null
  }

  return {
    isReady,
    error,
    init,
    saveVault,
    loadVault,
    hasVault,
    saveYdocState,
    loadYdocState,
  }
})
