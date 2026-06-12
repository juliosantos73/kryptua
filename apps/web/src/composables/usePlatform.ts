import { ref } from 'vue'

// window.Capacitor é injectado pelo bridge nativo antes de qualquer JS carregar —
// detecção síncrona é segura e mais fiável do que onMounted ao nível de módulo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cap = typeof window !== 'undefined' ? (window as any).Capacitor : null

const isNative = ref<boolean>(cap?.isNativePlatform?.() ?? false)
const isAndroid = ref<boolean>(cap?.getPlatform?.() === 'android')

export function usePlatform() {
  return { isNative, isAndroid }
}
