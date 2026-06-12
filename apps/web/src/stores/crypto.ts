import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

// Tipagem mínima do módulo Wasm gerado pelo wasm-pack
interface KryptuaWasm {
  derive_key: (password: string, salt: Uint8Array) => Uint8Array
  VaultManager: new (key: Uint8Array) => {
    encrypt_item: (json: string) => Uint8Array
    decrypt_item: (blob: Uint8Array) => string
  }
}

type VaultManagerInstance = InstanceType<KryptuaWasm['VaultManager']>

export const useCryptoStore = defineStore('crypto', () => {
  const isUnlocked = ref(false)
  const error = ref<string | null>(null)
  // shallowRef evita que o Vue tente tornar o objeto Wasm reativo recursivamente
  const manager = shallowRef<VaultManagerInstance | null>(null)
  let wasmModule: KryptuaWasm | null = null

  async function loadWasm(): Promise<KryptuaWasm> {
    if (!wasmModule) {
      // Com --target bundler o Wasm é importado estaticamente pelo bundler —
      // não há init() a chamar; o módulo está pronto ao ser importado.
      wasmModule = await import('kryptua-core') as unknown as KryptuaWasm
    }
    return wasmModule
  }

  async function unlock(password: string, salt: Uint8Array): Promise<void> {
    error.value = null
    try {
      const wasm = await loadWasm()
      const key = wasm.derive_key(password, salt)
      manager.value = new wasm.VaultManager(key)
      isUnlocked.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao desbloquear'
      throw e
    }
  }

  function lock(): void {
    manager.value = null
    isUnlocked.value = false
    error.value = null
  }

  function encryptItem(payloadJson: string): Uint8Array {
    if (!manager.value) throw new Error('Vault bloqueado')
    return manager.value.encrypt_item(payloadJson)
  }

  function decryptItem(blob: Uint8Array): string {
    if (!manager.value) throw new Error('Vault bloqueado')
    return manager.value.decrypt_item(blob)
  }

  return { isUnlocked, error, unlock, lock, encryptItem, decryptItem }
})
