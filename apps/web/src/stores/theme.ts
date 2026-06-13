import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

export type ThemePreference = 'system' | 'dark' | 'light'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>('system')

  function apply(pref: ThemePreference) {
    if (pref === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', pref)
    }
  }

  async function init() {
    try {
      const { value } = await Preferences.get({ key: 'kryptua-theme' })
      preference.value = (value as ThemePreference | null) ?? 'system'
    } catch {
      preference.value = 'system'
    }
    apply(preference.value)
  }

  async function set(pref: ThemePreference) {
    preference.value = pref
    apply(pref)
    try {
      await Preferences.set({ key: 'kryptua-theme', value: pref })
    } catch { /* non-fatal */ }
  }

  return { preference, init, set }
})
