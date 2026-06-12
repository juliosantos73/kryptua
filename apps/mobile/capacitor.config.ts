import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kryptua.vault',
  appName: 'Kryptua',
  // Aponta para o build do app web (gerado por apps/web/dist)
  webDir: '../web/dist',
  server: {
    // HTTPS scheme garante que COOP/COEP e SharedArrayBuffer funcionem no WebView
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: 'kryptua-release.keystore',
      keystoreAlias: 'kryptua',
    },
  },
  plugins: {
    // Preferences usa EncryptedSharedPreferences no Android (hardware-backed)
    Preferences: {
      group: 'com.kryptua.vault',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f1117',
    },
  },
}

export default config
