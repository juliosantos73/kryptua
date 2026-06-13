<template>
  <div :class="['vault-layout', { 'is-mobile': isMobileLayout }]">

    <!-- ── DESKTOP: Sidebar ── -->
    <aside v-if="!isMobileLayout" class="sidebar">
      <div class="sidebar-logo">
        <span>🔐</span>
        <span class="sidebar-title">Kryptua</span>
      </div>
      <div class="sidebar-footer">
        <div :class="['sync-status', syncStore.status]">
          <span class="sync-dot" />{{ syncLabel }}
        </div>
        <button
          :class="['btn-settings', { active: showSettings }]"
          @click="showSettings = !showSettings"
        >
          ⚙️ Definições
        </button>
        <button class="btn-lock" @click="lock">🔒 Bloquear</button>
      </div>
    </aside>

    <!-- ── LISTA de itens ── -->
    <section
      v-show="!isMobileLayout || mobilePanel === 'list'"
      class="list-panel"
    >
      <!-- Header mobile -->
      <div v-if="isMobileLayout" class="mobile-header">
        <span class="mobile-logo">🔐 Kryptua</span>
        <div :class="['sync-dot-sm', syncStore.status]" :title="syncLabel" />
      </div>

      <!-- Loading state: a ligar ao relay e vault ainda vazio -->
      <div v-if="syncLoading" class="sync-loading">
        <div class="sync-spinner" />
        <p class="sync-loading-title">A sincronizar vault...</p>
        <p class="sync-loading-hint">Os seus dados estão a ser carregados</p>
      </div>

      <!-- Offline banner: relay inacessível há demasiado tempo -->
      <div v-if="offlineTooLong" class="offline-banner">
        Sem ligação ao servidor — a funcionar com dados locais
      </div>

      <ItemList
        v-show="!syncLoading"
        :items="allItems"
        :schemas="schemas"
        :selected-id="selectedItem?.id"
        @select="onItemSelect"
      />
    </section>

    <!-- ── DETALHE / FORMULÁRIO do item ── -->
    <section
      v-show="!isMobileLayout ? !showSettings : mobilePanel === 'detail'"
      class="detail-panel"
    >
      <!-- Botão voltar mobile (só no modo detalhe, não no formulário — o form tem cancelar próprio) -->
      <button v-if="isMobileLayout && mobilePanel === 'detail' && !showForm" class="btn-back" @click="mobilePanel = 'list'">
        ← Voltar
      </button>
      <AddItemModal
        v-if="showForm"
        :schemas="schemas"
        :editData="editingData ?? undefined"
        @cancel="cancelForm"
        @save="handleSave"
      />
      <ItemDetail
        v-else
        :item="selectedItem"
        :schemas="schemas"
        @delete="handleDelete"
        @edit="handleEdit"
        @favorite="handleFavoriteToggle"
      />
    </section>

    <!-- ── DEFINIÇÕES (desktop: substitui detalhe; mobile: painel próprio) ── -->
    <section
      v-show="!isMobileLayout ? showSettings : mobilePanel === 'settings'"
      class="detail-panel"
    >
      <button v-if="isMobileLayout && mobilePanel === 'settings'" class="btn-back" @click="mobilePanel = 'list'">
        ← Voltar
      </button>
      <SettingsPanel />
    </section>

    <!-- ── BOTTOM NAV (mobile) ── -->
    <nav v-if="isMobileLayout" class="bottom-nav">
      <button
        :class="['bottom-tab', { active: mobilePanel !== 'settings' }]"
        @click="mobilePanel = 'list'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="tab-label">O meu cofre</span>
      </button>
      <button
        :class="['bottom-tab', { active: mobilePanel === 'settings' }]"
        @click="mobilePanel = 'settings'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span class="tab-label">Definições</span>
      </button>
      <button class="bottom-tab" @click="lock">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span class="tab-label">Sair</span>
      </button>
    </nav>

    <!-- FAB — float acima do bottom nav -->
    <button
      v-show="(!isMobileLayout || mobilePanel === 'list') && !showForm && !showSettings"
      class="fab"
      @click="openForm()"
      aria-label="Novo item"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- Erro de save (vault bloqueado, wasm, etc.) -->
    <div v-if="saveError" class="save-error-toast" @click="saveError = ''">
      ⚠️ {{ saveError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useDbStore } from '@/stores/db'
import { useSyncStore } from '@/stores/sync'
import { usePlatform } from '@/composables/usePlatform'
import ItemList from '@/components/ItemList.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import type { ItemRow, ItemPayload, VaultMeta } from '@/types/vault'
import { useTypeSchemas } from '@/composables/useTypeSchemas'

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()
const syncStore = useSyncStore()
const { isNative } = usePlatform()

const { schemas } = useTypeSchemas()

const selectedItem = ref<ItemRow | null>(null)
const showForm = ref(false)
const saveError = ref('')
const editingData = ref<{ id: string; title: string; itemType: string; payload: ItemPayload; createdAt: number } | null>(null)
const mobilePanel = ref<'list' | 'detail' | 'settings'>('list')
const showSettings = ref(false) // desktop only

// Mobile: nativo Capacitor OU viewport estreito
const isMobileLayout = computed(() => isNative.value || window.innerWidth < 768)

const syncLabel = computed(() => ({
  connected:    'Sincronizado',
  connecting:   'Conectando...',
  disconnected: 'Offline',
  error:        'Erro sync',
}[syncStore.status]))

const allItems = computed<ItemRow[]>(() => {
  void syncStore.version
  return syncStore.getItems().map((i) => ({
    id: i.id,
    vaultId: vault.value?.id ?? '',
    itemType: i.itemType,
    title: i.title,
    isFavorite: i.isFavorite ?? false,
    encryptedPayload: i.blob,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }))
})

const vault = ref<VaultMeta | null>(null)

// Sync resilience ─────────────────────────────────────────────────────────────

// Mostra loading enquanto está a ligar E ainda não há itens locais
const syncLoading = computed(() =>
  syncStore.status === 'connecting' && allItems.value.length === 0,
)

// Após 10 s em connecting sem itens → modo offline
const offlineTooLong = ref(false)
let offlineTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => syncStore.status,
  (s) => {
    if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null }
    if (s === 'connecting' || s === 'error') {
      offlineTimer = setTimeout(() => { offlineTooLong.value = true }, 10_000)
    } else {
      offlineTooLong.value = false
    }
  },
)

onBeforeUnmount(() => {
  if (offlineTimer) clearTimeout(offlineTimer)
})

// ─────────────────────────────────────────────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(async () => {
    const state = syncStore.getDocState()
    if (state && vault.value) await dbStore.saveYdocState(vault.value.id, state)
  }, 500)
}

onMounted(async () => {
  await dbStore.init()
  vault.value = await dbStore.loadVault()
  if (!vault.value) { router.replace({ name: 'unlock' }); return }

  const savedState = await dbStore.loadYdocState(vault.value.id)
  syncStore.init(vault.value.id, savedState ?? undefined)

  const doc = syncStore.ydoc
  if (doc) doc.on('update', schedulePersist)
})

onUnmounted(() => {
  if (persistTimer) clearTimeout(persistTimer)
  syncStore.destroy()
})

watch(allItems, (items) => {
  if (selectedItem.value && !items.find((i) => i.id === selectedItem.value!.id)) {
    selectedItem.value = null
    mobilePanel.value = 'list'
  }
})

function openForm() {
  editingData.value = null
  showForm.value = true
  if (isMobileLayout.value) mobilePanel.value = 'detail'
}

function cancelForm() {
  showForm.value = false
  editingData.value = null
  saveError.value = ''
  if (isMobileLayout.value && !selectedItem.value) mobilePanel.value = 'list'
}

function onItemSelect(item: ItemRow) {
  selectedItem.value = item
  showForm.value = false
  editingData.value = null
  if (isMobileLayout.value) mobilePanel.value = 'detail'
}

async function handleFavoriteToggle(id: string) {
  syncStore.toggleFavorite(id)
  const state = syncStore.getDocState()
  if (state && vault.value) await dbStore.saveYdocState(vault.value.id, state)
  // Refresh selectedItem reactivity
  const updated = allItems.value.find(i => i.id === id)
  if (updated && selectedItem.value?.id === id) selectedItem.value = updated
}

async function handleSave(
  id: string | null,
  title: string,
  type: string,
  payload: ItemPayload,
  createdAt?: number,
) {
  saveError.value = ''
  if (!vault.value) return
  try {
    const blob = cryptoStore.encryptItem(JSON.stringify(payload))
    const now = Date.now()
    const itemId = id ?? crypto.randomUUID()

    const existing = id ? syncStore.itemMeta?.get(itemId) : undefined
    if (id) {
      syncStore.updateItem(itemId, { title, itemType: type, isFavorite: existing?.isFavorite ?? false, createdAt: createdAt ?? now, updatedAt: now }, blob)
    } else {
      syncStore.addItem(itemId, { title, itemType: type, isFavorite: false, createdAt: now, updatedAt: now }, blob)
    }

    await dbStore.saveYdocState(vault.value.id, syncStore.getDocState()!)
    showForm.value = false
    editingData.value = null
    setTimeout(() => {
      selectedItem.value = allItems.value.find((i) => i.id === itemId) ?? null
      if (isMobileLayout.value && selectedItem.value) mobilePanel.value = 'detail'
    }, 0)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('bloqueado') || msg.includes('locked')) {
      lock()
    } else {
      saveError.value = 'Não foi possível guardar. Tente novamente.'
    }
  }
}

function handleEdit(item: ItemRow) {
  try {
    const json = cryptoStore.decryptItem(item.encryptedPayload)
    const payload = JSON.parse(json) as ItemPayload
    editingData.value = {
      id: item.id,
      title: item.title,
      itemType: item.itemType,  // now a plain string (schema ID)
      payload,
      createdAt: item.createdAt,
    }
    showForm.value = true
    if (isMobileLayout.value) mobilePanel.value = 'detail'
  } catch {
    saveError.value = 'Não foi possível abrir o item para edição.'
  }
}

function handleDelete(id: string) {
  syncStore.deleteItem(id)
  if (selectedItem.value?.id === id) {
    selectedItem.value = null
    mobilePanel.value = 'list'
  }
}

function lock() {
  syncStore.destroy()
  cryptoStore.lock()
  router.push({ name: 'unlock' })
}
</script>

<style scoped>
/* ── Desktop: 3 colunas ── */
.vault-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 200px 280px 1fr;
  overflow: hidden;
}

/* ── Mobile: coluna única + bottom nav ── */
.vault-layout.is-mobile {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto;
  padding-bottom: 0;
}

/* Sidebar desktop */
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1.1rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 1.1rem;
}

.sidebar-title { font-weight: 700; font-size: 1rem; color: var(--color-accent); }

.sidebar-footer {
  padding: 0.75rem 0.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  padding: 0 0.25rem;
}

.sync-status.connected    { color: var(--color-success); }
.sync-status.connecting   { color: #f6ad55; }
.sync-status.disconnected { color: var(--color-text-muted); }
.sync-status.error        { color: var(--color-danger); }

.sync-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Sync dot compacto para mobile header */
.sync-dot-sm {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sync-dot-sm.connected    { background: var(--color-success); }
.sync-dot-sm.connecting   { background: #f6ad55; }
.sync-dot-sm.disconnected { background: var(--color-border); }
.sync-dot-sm.error        { background: var(--color-danger); }

.btn-settings {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  text-align: left;
  transition: all 0.15s;
}
.btn-settings:hover,
.btn-settings.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.btn-lock {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  text-align: left;
  transition: all 0.15s;
}
.btn-lock:hover { border-color: var(--color-danger); color: var(--color-danger); }

/* Painéis */
.list-panel {
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.is-mobile .list-panel {
  border-right: none;
  grid-row: 1;
}

.detail-panel {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.is-mobile .detail-panel {
  grid-row: 1;
}

/* Mobile header no topo da lista */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.mobile-logo {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-accent);
}

/* Botão voltar no detalhe mobile */
.btn-back {
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-accent);
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  width: 100%;
  flex-shrink: 0;
}

/* Bottom navigation bar (mobile) */
.bottom-nav {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  grid-row: 2;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.bottom-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.6rem 0.25rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  transition: color 0.15s;
}

.bottom-tab.active { color: var(--color-accent); }
.bottom-tab:hover  { color: var(--color-text); }

.tab-label {
  font-size: 0.65rem;
  font-weight: 500;
  line-height: 1;
}

/* Sync loading state */
.sync-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--color-text-muted);
}

@keyframes spin { to { transform: rotate(360deg); } }

.sync-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sync-loading-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.sync-loading-hint {
  font-size: 0.78rem;
  text-align: center;
}

.offline-banner {
  background: color-mix(in srgb, #f6ad55 15%, transparent);
  border-bottom: 1px solid #f6ad55;
  color: #c07a2a;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.4rem 1rem;
  text-align: center;
  flex-shrink: 0;
}

/* ── FAB ─────────────────────────────── */
.fab {
  position: fixed;
  right: 1.5rem;
  bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  z-index: 50;
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
}

.fab:hover {
  background: var(--color-accent-hover);
  transform: scale(1.07);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.fab:active { transform: scale(0.96); }

/* Desktop: FAB alongside the list panel, not over the detail panel */
.vault-layout:not(.is-mobile) .fab {
  bottom: 1.5rem;
  right: calc(100% - 480px + 1.5rem); /* aligned to list panel */
}

.save-error-toast {
  position: fixed;
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-danger);
  color: #fff;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 200;
  max-width: 90vw;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
</style>
