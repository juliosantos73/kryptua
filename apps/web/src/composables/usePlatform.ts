import { ref, onMounted } from 'vue'

// Detecta se está rodando dentro do Capacitor (Android/iOS) ou no browser
const isNative = ref(false)
const isAndroid = ref(false)

onMounted(async () => {
  // Capacitor injeta window.Capacitor no WebView nativo
  if (typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor) {
    const cap = (window as unknown as { Capacitor: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor
    isNative.value = cap.isNativePlatform()
    isAndroid.value = cap.getPlatform() === 'android'
  }
})

export function usePlatform() {
  return { isNative, isAndroid }
}
