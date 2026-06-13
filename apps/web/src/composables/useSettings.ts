import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

export type ClipboardTimeout = 'never' | '10s' | '30s' | '1m' | '2m' | '5m'

// Exposed by MainActivity.addJavascriptInterface — available on native Android only
function nativeSetScreenshotProtection(protect: boolean) {
  const bridge = (window as unknown as { KryptuaNative?: { setScreenshotProtection(v: boolean): void } }).KryptuaNative
  bridge?.setScreenshotProtection(protect)
}

const clipboardTimeout = ref<ClipboardTimeout>('never')
const allowCopyPaste = ref(true)
const allowScreenshots = ref(true)

let initialized = false
let clearTimer: ReturnType<typeof setTimeout> | null = null

async function init() {
  if (initialized) return
  initialized = true
  const [ct, acp, as_] = await Promise.all([
    Preferences.get({ key: 'setting_clipboardTimeout' }),
    Preferences.get({ key: 'setting_allowCopyPaste' }),
    Preferences.get({ key: 'setting_allowScreenshots' }),
  ])
  clipboardTimeout.value = (ct.value as ClipboardTimeout) ?? 'never'
  allowCopyPaste.value = acp.value !== 'false'
  allowScreenshots.value = as_.value !== 'false'
}

const TIMEOUT_MS: Record<ClipboardTimeout, number | null> = {
  never: null, '10s': 10_000, '30s': 30_000, '1m': 60_000, '2m': 120_000, '5m': 300_000,
}

export function useSettings() {
  init()

  async function setClipboardTimeout(t: ClipboardTimeout) {
    clipboardTimeout.value = t
    await Preferences.set({ key: 'setting_clipboardTimeout', value: t })
  }

  async function setAllowCopyPaste(v: boolean) {
    allowCopyPaste.value = v
    await Preferences.set({ key: 'setting_allowCopyPaste', value: String(v) })
  }

  async function setAllowScreenshots(v: boolean) {
    allowScreenshots.value = v
    await Preferences.set({ key: 'setting_allowScreenshots', value: String(v) })
    // !v: allowScreenshots=false → protect=true (block screenshots)
    nativeSetScreenshotProtection(!v)
  }

  function scheduleClipboardClear() {
    const ms = TIMEOUT_MS[clipboardTimeout.value]
    if (!ms) return
    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = setTimeout(async () => {
      try { await navigator.clipboard.writeText('') } catch {}
      clearTimer = null
    }, ms)
  }

  return {
    clipboardTimeout,
    allowCopyPaste,
    allowScreenshots,
    setClipboardTimeout,
    setAllowCopyPaste,
    setAllowScreenshots,
    scheduleClipboardClear,
  }
}
