import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

const BIOMETRIC_KEY_STORE = 'kryptua_vault_key'
const BIOMETRIC_DISMISSED_KEY = 'kryptua_bio_dismissed'

// Acede ao plugin pelo bridge Capacitor sem importar o pacote no bundle —
// evita o erro "Class extends value undefined" causado pelo native.js do plugin.
// O plugin regista-se como 'BiometricAuthNative' (ver @CapacitorPlugin annotation).
function getPlugin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)?.Capacitor?.Plugins?.BiometricAuthNative ?? null
}

export function useBiometrics() {
  const isAvailable = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function checkAvailability(): Promise<boolean> {
    try {
      const plugin = getPlugin()
      if (!plugin) { isAvailable.value = false; return false }
      const result = await plugin.checkBiometry()
      isAvailable.value = result.isAvailable ?? false
      return isAvailable.value
    } catch (e) {
      isAvailable.value = false
      return false
    }
  }

  async function authenticate(reason: string): Promise<void> {
    const plugin = getPlugin()
    if (!plugin) throw new Error('BiometricAuthNative plugin não disponível')
    // Chama internalAuthenticate directamente (método @PluginMethod no Java)
    // com as chaves que o Java lê: reason, cancelTitle, allowDeviceCredential
    await plugin.internalAuthenticate({
      reason,
      cancelTitle: 'Cancelar',
      allowDeviceCredential: false,
    })
  }

  async function setupQuickUnlock(key: Uint8Array): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await authenticate('Confirme a sua identidade para ativar o Quick Unlock')
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
      await authenticate('Use a sua biometria para abrir o Kryptua')
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
    const { value } = await Preferences.get({ key: BIOMETRIC_KEY_STORE })
    return !!value
  }

  async function dismiss(): Promise<void> {
    await Preferences.set({ key: BIOMETRIC_DISMISSED_KEY, value: 'true' })
  }

  async function isDismissed(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIOMETRIC_DISMISSED_KEY })
    return value === 'true'
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
