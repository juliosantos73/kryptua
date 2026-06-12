import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

const BIOMETRIC_KEY_STORE = 'kryptua_vault_key'
// Guardado quando o utilizador clica "Agora não" — evita prompt em cada unlock
const BIOMETRIC_DISMISSED_KEY = 'kryptua_bio_dismissed'

function getBiometricPlugin(): unknown {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (plugin as any).checkBiometry()
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (plugin as any).authenticate({
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
      await Preferences.remove({ key: BIOMETRIC_DISMISSED_KEY })
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

  // Regista que o utilizador optou por não usar biometria —
  // impede que o prompt apareça a cada unlock com senha
  async function dismiss(): Promise<void> {
    await Preferences.set({ key: BIOMETRIC_DISMISSED_KEY, value: 'true' })
  }

  async function isDismissed(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_DISMISSED_KEY })
      return value === 'true'
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
    dismiss,
    isDismissed,
  }
}
