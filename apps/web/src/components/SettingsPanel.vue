<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2>Definições</h2>
    </div>

    <div class="settings-body">

      <!-- ── Segurança ── -->
      <section class="settings-section">
        <h3 class="section-title">Segurança</h3>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Quick Unlock (Biometria)</span>
            <span class="setting-desc">
              {{ bioAvailable
                ? (bioEnabled ? 'Ativo — toque para desativar' : 'Entre sem digitar a password')
                : 'Não disponível neste dispositivo' }}
            </span>
          </div>
          <button
            v-if="bioAvailable"
            :class="['toggle', { on: bioEnabled }]"
            :disabled="bioLoading"
            :aria-label="bioEnabled ? 'Desativar biometria' : 'Ativar biometria'"
            @click="toggleBiometric"
          >
            <span class="toggle-knob" />
          </button>
        </div>

        <!-- Formulário de confirmação de password para ativar biometria -->
        <transition name="slide">
          <div v-if="showPasswordConfirm" class="confirm-block">
            <p class="confirm-hint">Insira a Master Password para confirmar a ativação:</p>
            <div class="confirm-row">
              <PasswordInput
                ref="confirmInputRef"
                v-model="confirmPassword"
                placeholder="Master Password"
                autocomplete="current-password"
                @keydown.enter="confirmEnable"
              />
              <button class="btn-confirm" :disabled="bioLoading || !confirmPassword" @click="confirmEnable">
                {{ bioLoading ? '…' : 'OK' }}
              </button>
              <button class="btn-cancel-sm" :disabled="bioLoading" @click="cancelEnable">✕</button>
            </div>
            <p v-if="bioError" class="bio-error">{{ bioError }}</p>
          </div>
        </transition>
      </section>

      <!-- ── Vault ── -->
      <section class="settings-section">
        <h3 class="section-title">Vault</h3>
        <div class="setting-row no-action">
          <div class="setting-info">
            <span class="setting-label">Nome</span>
            <span class="setting-desc">{{ vaultName }}</span>
          </div>
        </div>
        <div class="setting-row no-action">
          <div class="setting-info">
            <span class="setting-label">Criado em</span>
            <span class="setting-desc">{{ vaultCreatedAt }}</span>
          </div>
        </div>
      </section>

      <!-- ── Sincronização ── -->
      <section class="settings-section">
        <h3 class="section-title">Sincronização</h3>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Sincronizar agora</span>
            <span class="setting-desc">{{ lastSyncLabel }}</span>
          </div>
          <button class="btn-sm" :disabled="syncing" @click="syncNow">
            {{ syncing ? '...' : 'Sincronizar' }}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Exportar vault</span>
            <span class="setting-desc">Partilha este vault com outro dispositivo</span>
          </div>
          <button class="btn-sm" @click="showExportCode = !showExportCode">
            {{ showExportCode ? 'Fechar' : 'Exportar' }}
          </button>
        </div>
        <transition name="slide">
          <div v-if="showExportCode" class="export-block">
            <div class="qr-wrapper">
              <img v-if="qrDataUrl" :src="qrDataUrl" class="qr-img" alt="QR code do vault" />
              <div v-else class="qr-placeholder">A gerar...</div>
            </div>
            <p class="confirm-hint">
              Scan no outro dispositivo em <strong>Importar Vault</strong> e usa a mesma Master Password.
            </p>
            <div class="confirm-row">
              <input
                readonly
                :value="exportCode"
                class="confirm-input export-code-input"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button class="btn-confirm" @click="copyCode">
                {{ copied ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>
        </transition>
      </section>

      <!-- ── Aparência ── -->
      <section class="settings-section">
        <h3 class="section-title">Aparência</h3>
        <div class="setting-row no-action">
          <div class="setting-info">
            <span class="setting-label">Tema</span>
          </div>
          <div class="theme-group">
            <button
              v-for="t in themes"
              :key="t.value"
              :class="['theme-btn', { active: themeStore.preference === t.value }]"
              @click="themeStore.set(t.value)"
            >{{ t.label }}</button>
          </div>
        </div>
      </section>

      <!-- ── Outros ── -->
      <section class="settings-section">
        <h3 class="section-title">Outros</h3>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Limpar área de transferência</span>
            <span class="setting-desc">Apaga o valor copiado automaticamente</span>
          </div>
          <select class="setting-select" :value="settings.clipboardTimeout.value" @change="settings.setClipboardTimeout(($event.target as HTMLSelectElement).value as ClipboardTimeout)">
            <option value="never">Nunca</option>
            <option value="10s">10 segundos</option>
            <option value="30s">30 segundos</option>
            <option value="1m">1 minuto</option>
            <option value="2m">2 minutos</option>
            <option value="5m">5 minutos</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Permitir copiar/colar</span>
            <span class="setting-desc">Mostra botões de cópia nos campos</span>
          </div>
          <button
            :class="['toggle', { on: settings.allowCopyPaste.value }]"
            @click="settings.setAllowCopyPaste(!settings.allowCopyPaste.value)"
          >
            <span class="toggle-knob" />
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Permitir captura de ecrã</span>
            <span class="setting-desc">Desativar impede screenshots e gravação</span>
          </div>
          <button
            :class="['toggle', { on: settings.allowScreenshots.value }]"
            @click="settings.setAllowScreenshots(!settings.allowScreenshots.value)"
          >
            <span class="toggle-knob" />
          </button>
        </div>
      </section>

      <!-- ── Tipos ── -->
      <section class="settings-section">
        <h3 class="section-title">Tipos de item</h3>
        <TypeSchemaManager :item-counts="itemCounts" />
      </section>

      <!-- ── Versão ── -->
      <section class="settings-section">
        <h3 class="section-title">Aplicação</h3>
        <div class="setting-row no-action">
          <div class="setting-info">
            <span class="setting-label">Versão</span>
            <span class="setting-desc">0.1.0 (debug)</span>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import QRCode from 'qrcode'
import { useDbStore } from '@/stores/db'
import { useSyncStore } from '@/stores/sync'
import { useBiometrics } from '@/composables/useBiometrics'
import { useThemeStore } from '@/stores/theme'
import { useSettings } from '@/composables/useSettings'
import type { ClipboardTimeout } from '@/composables/useSettings'
import type { ThemePreference } from '@/stores/theme'
import type { VaultMeta } from '@/types/vault'
import PasswordInput from './PasswordInput.vue'
import TypeSchemaManager from './TypeSchemaManager.vue'
import { useSyncStore as useSyncForCounts } from '@/stores/sync'

const themeStore = useThemeStore()
const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '💻 Sistema' },
  { value: 'light',  label: '☀️ Claro' },
  { value: 'dark',   label: '🌙 Escuro' },
]

const dbStore = useDbStore()
const syncStore = useSyncStore()
const syncForCounts = useSyncForCounts()
const biometrics = useBiometrics()
const settings = useSettings()

const itemCounts = computed(() => {
  void syncForCounts.version
  const counts: Record<string, number> = {}
  for (const item of syncForCounts.getItems()) {
    counts[item.itemType] = (counts[item.itemType] ?? 0) + 1
  }
  return counts
})

// ── Sincronização ─────────────────────────────
const syncing = ref(false)
const lastSyncAt = ref<number | null>(null)

const lastSyncLabel = computed(() => {
  if (!lastSyncAt.value) return 'Nunca sincronizado'
  return `Última: ${new Date(lastSyncAt.value).toLocaleString('pt-PT')}`
})

let statusUnwatch: (() => void) | null = null

onMounted(() => {
  statusUnwatch = watch(
    () => syncStore.status,
    (s) => { if (s === 'connected') lastSyncAt.value = Date.now() },
    { immediate: true }
  )
})

onUnmounted(() => { statusUnwatch?.() })

async function syncNow() {
  syncing.value = true
  const v = vault.value ?? await dbStore.loadVault()
  if (!v) { syncing.value = false; return }
  const saved = await dbStore.loadYdocState(v.id)
  syncStore.destroy()
  syncStore.init(v.id, saved ?? undefined)
  syncing.value = false
  lastSyncAt.value = Date.now()
}

const bioAvailable = ref(false)
const bioEnabled = ref(false)
const bioLoading = ref(false)
const bioError = ref('')

const showPasswordConfirm = ref(false)
const confirmPassword = ref('')
const confirmInputRef = ref<{ focus: () => void } | null>(null)

const vault = ref<VaultMeta | null>(null)
const vaultName = computed(() => vault.value?.name ?? '—')
const vaultCreatedAt = computed(() => {
  if (!vault.value) return '—'
  return new Date(vault.value.createdAt).toLocaleDateString('pt-PT', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
})

// Export/import
const showExportCode = ref(false)
const copied = ref(false)
const qrDataUrl = ref('')

function saltToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

const exportCode = computed(() => {
  if (!vault.value) return ''
  return btoa(JSON.stringify({ v: 1, id: vault.value.id, salt: saltToBase64(vault.value.salt), name: vault.value.name }))
})

watch(showExportCode, async (open) => {
  if (!open || !exportCode.value) return
  qrDataUrl.value = await QRCode.toDataURL(exportCode.value, {
    width: 220,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
})

async function copyCode() {
  await navigator.clipboard.writeText(exportCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

onMounted(async () => {
  vault.value = await dbStore.loadVault()
  bioAvailable.value = await biometrics.checkAvailability()
  if (bioAvailable.value) bioEnabled.value = await biometrics.hasQuickUnlock()
})

async function toggleBiometric() {
  if (bioEnabled.value) {
    await disableBiometric()
  } else {
    showPasswordConfirm.value = true
    await nextTick()
    confirmInputRef.value?.focus()
  }
}

async function confirmEnable() {
  if (!confirmPassword.value) return
  const v = vault.value ?? await dbStore.loadVault()
  if (!v) return
  bioLoading.value = true
  bioError.value = ''
  try {
    const wasm = await import('kryptua-core') as unknown as { derive_key: (p: string, s: Uint8Array) => Uint8Array }
    const key = wasm.derive_key(confirmPassword.value, v.salt)
    const ok = await biometrics.setupQuickUnlock(key)
    if (ok) {
      bioEnabled.value = true
      showPasswordConfirm.value = false
      confirmPassword.value = ''
    } else {
      bioError.value = biometrics.error.value ?? 'Falha ao ativar biometria'
    }
  } catch (e) {
    bioError.value = e instanceof Error ? e.message : 'Password incorreta ou erro de biometria'
  } finally {
    bioLoading.value = false
  }
}

function cancelEnable() {
  showPasswordConfirm.value = false
  confirmPassword.value = ''
  bioError.value = ''
}

async function disableBiometric() {
  bioLoading.value = true
  try {
    await biometrics.clearQuickUnlock()
    await biometrics.dismiss() // mantém o flag para não pedir automaticamente
    bioEnabled.value = false
  } finally {
    bioLoading.value = false
  }
}
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  overflow: hidden;
}

.settings-header {
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.settings-header h2 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.settings-section {
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 0.5rem 1.5rem 0.4rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.5rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  gap: 1rem;
}

.setting-row:last-of-type {
  border-bottom: 1px solid var(--color-border);
}

.setting-row.no-action {
  cursor: default;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.setting-desc {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Select */
.setting-select {
  flex-shrink: 0;
  padding: 0.35rem 0.65rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;
}

.setting-select:focus { border-color: var(--color-accent); }

/* Toggle switch */
.toggle {
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--color-border);
  border: none;
  flex-shrink: 0;
  transition: background 0.2s;
  cursor: pointer;
}

.toggle.on {
  background: var(--color-accent);
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  display: block;
}

.toggle.on .toggle-knob {
  transform: translateX(18px);
}

/* Bloco de confirmação de password */
.confirm-block {
  padding: 0.75rem 1.5rem 1rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.confirm-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

.confirm-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.confirm-row :deep(.pw-wrap) {
  flex: 1;
  min-width: 0;
}

.confirm-input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
}

.confirm-input:focus {
  border-color: var(--color-accent);
}

.btn-confirm {
  padding: 0.55rem 1rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel-sm {
  padding: 0.55rem 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.bio-error {
  font-size: 0.78rem;
  color: var(--color-danger);
  margin-top: 0.5rem;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-accent); }

.export-block {
  padding: 0.75rem 1.5rem 1rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.export-code-input {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0;
  cursor: text;
  user-select: all;
}

.qr-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.qr-img {
  width: 220px;
  height: 220px;
  border-radius: var(--radius);
  border: 6px solid #fff;
  display: block;
}

.qr-placeholder {
  width: 220px;
  height: 220px;
  background: var(--color-surface-2);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

/* Selector de tema */
.theme-group {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.theme-btn {
  padding: 0.35rem 0.7rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  transition: all 0.15s;
  white-space: nowrap;
}

.theme-btn.active {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

/* Animação do bloco de confirmação */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
