// Stub de tipos para o plugin de biometria (instalado apenas no projeto mobile)
declare module '@aparajita/capacitor-biometric-auth' {
  export interface CheckBiometryResult {
    isAvailable: boolean
    biometryType?: number
    reason?: string
  }

  export interface AuthenticateOptions {
    reason?: string
    title?: string
    subtitle?: string
    description?: string
    cancelTitle?: string
    allowDeviceCredential?: boolean
  }

  export const BiometricAuth: {
    checkBiometry(): Promise<CheckBiometryResult>
    authenticate(options?: AuthenticateOptions): Promise<void>
  }
}
