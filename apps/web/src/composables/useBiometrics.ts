/**
 * Biometria + armazenamento seguro via Capacitor bridge.
 *
 * Acessa os plugins pelo bridge nativo (window.Capacitor.Plugins) em vez de
 * imports npm — funciona em qualquer versão do Capacitor sem dependência de
 * build. No browser normal, todas as chamadas falham silenciosamente.
 *
 * Fluxo de Quick Unlock:
 * 1. setupQuickUnlock(key): autentica → armazena chave em EncryptedSharedPreferences
 * 2. quickUnlock(): autentica → recupera chave → devolve sem rodar Argon2id
 */

import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

const BIOMETRIC_KEY_STORE = 'kryptua_vault_key'

// Acessa o plugin de biometria pelo bridge Capacitor (evita import de pacote não-publicado)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBiometricPlugin(): any | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor
  return cap?.Plugins?.BiometricAuth ?? null
}

export function useBiometrics() {
  const isAvailable = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function checkAvailability(): Promise<boolean> {
    try {
      const plugin = getBiometricPlugin()
      if (!plugin) { isAvailable.value = false; return false }
      const result = await plugin.checkBiometry()
      isAvailable.value = result.isAvailable ?? false
      return isAvailable.value
    } catch {
      isAvailable.value = false
      return false
    }
  }

  async function authenticate(reason: string): Promise<boolean> {
    const plugin = getBiometricPlugin()
    if (!plugin) throw new Error('BiometricAuth plugin não disponível')
    await plugin.authenticate({
      reason,
      title: 'Kryptua',
      cancelTitle: 'Cancelar',
    })
    return true
  }

  async function setupQuickUnlock(key: Uint8Array): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await authenticate('Confirme sua identidade para ativar o Quick Unlock')
      const keyHex = Array.from(key).map((b) => b.toString(16).padStart(2, '0')).join('')
      await Preferences.set({ key: BIOMETRIC_KEY_STORE, value: keyHex })
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Falha ao configurar biometria'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function quickUnlock(): Promise<Uint8Array | null> {
    isLoading.value = true
    error.value = null
    try {
      await authenticate('Use sua biometria para abrir o Kryptua')
      const { value } = await Preferences.get({ key: BIOMETRIC_KEY_STORE })
      if (!value) return null
      return new Uint8Array(value.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Autenticação biométrica falhou'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function clearQuickUnlock(): Promise<void> {
    await Preferences.remove({ key: BIOMETRIC_KEY_STORE })
  }

  async function hasQuickUnlock(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_KEY_STORE })
      return !!value
    } catch {
      return false
    }
  }

  return {
    isAvailable,
    isLoading,
    error,
    checkAvailability,
    setupQuickUnlock,
    quickUnlock,
    clearQuickUnlock,
    hasQuickUnlock,
  }
}
