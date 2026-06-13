<template>
  <div class="mobile-layout">

    <!-- ── LISTA ── -->
    <section v-show="mobilePanel === 'list'" class="panel">
      <div class="mobile-header">
        <span class="mobile-logo">🔐 Kryptua</span>
        <div :class="['sync-dot', syncStore.status]" :title="syncLabel" />
      </div>

      <div v-if="syncLoading" class="sync-loading">
        <div class="spinner" />
        <p class="sync-title">A sincronizar vault...</p>
        <p class="sync-hint">Os seus dados estão a ser carregados</p>
      </div>

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

    <!-- ── DETALHE / FORMULÁRIO ── -->
    <section v-show="mobilePanel === 'detail'" class="panel">
      <button class="btn-back" @click="mobilePanel = 'list'">← Voltar</button>
      <AddItemModal
        v-if="showForm"
        :schemas="schemas"
        :edit-data="editingData ?? undefined"
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

    <!-- ── DEFINIÇÕES ── -->
    <section v-show="mobilePanel === 'settings'" class="panel">
      <button class="btn-back" @click="mobilePanel = 'list'">← Voltar</button>
      <SettingsPanel />
    </section>

    <!-- ── BOTTOM NAV ── -->
    <nav class="bottom-nav">
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
      <button class="bottom-tab" @click="$emit('lock')">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span class="tab-label">Sair</span>
      </button>
    </nav>

    <!-- FAB -->
    <button
      v-show="mobilePanel === 'list' && !showForm"
      class="fab"
      aria-label="Novo item"
      @click="openForm()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <div v-if="saveError" class="save-toast" @click="saveError = ''">⚠️ {{ saveError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue'
import type { Ref } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useSyncStore } from '@/stores/sync'
import { useTypeSchemas } from '@/composables/useTypeSchemas'
import type { ItemRow, ItemPayload, VaultMeta } from '@/types/vault'
import ItemList from '@/components/ItemList.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

defineEmits<{ lock: [] }>()

const vault = inject<Ref<VaultMeta | null>>('vault')!
const persistNow = inject<() => Promise<void>>('persistNow')!

const cryptoStore = useCryptoStore()
const syncStore = useSyncStore()
const { schemas } = useTypeSchemas()

const selectedItem = ref<ItemRow | null>(null)
const showForm = ref(false)
const editingData = ref<{ id: string; title: string; itemType: string; payload: ItemPayload; createdAt: number } | null>(null)
const mobilePanel = ref<'list' | 'detail' | 'settings'>('list')
const saveError = ref('')

const syncLabel = computed(() => ({
  connected: 'Sincronizado', connecting: 'Conectando...', disconnected: 'Offline', error: 'Erro sync',
}[syncStore.status]))

const allItems = computed<ItemRow[]>(() => {
  void syncStore.version
  return syncStore.getItems().map(i => ({
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

const syncLoading = computed(() => syncStore.status === 'connecting' && allItems.value.length === 0)
const offlineTooLong = ref(false)
let offlineTimer: ReturnType<typeof setTimeout> | null = null

watch(() => syncStore.status, (s) => {
  if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null }
  if (s === 'connecting' || s === 'error') {
    offlineTimer = setTimeout(() => { offlineTooLong.value = true }, 10_000)
  } else {
    offlineTooLong.value = false
  }
})

onBeforeUnmount(() => { if (offlineTimer) clearTimeout(offlineTimer) })

watch(allItems, (items) => {
  if (selectedItem.value && !items.find(i => i.id === selectedItem.value!.id)) {
    selectedItem.value = null
    mobilePanel.value = 'list'
  }
})

function openForm() {
  editingData.value = null
  showForm.value = true
  mobilePanel.value = 'detail'
}

function cancelForm() {
  showForm.value = false
  editingData.value = null
  saveError.value = ''
  if (!selectedItem.value) mobilePanel.value = 'list'
}

function onItemSelect(item: ItemRow) {
  selectedItem.value = item
  showForm.value = false
  editingData.value = null
  mobilePanel.value = 'detail'
}

async function handleSave(id: string | null, title: string, type: string, payload: ItemPayload, createdAt?: number) {
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
    await persistNow()
    showForm.value = false
    editingData.value = null
    setTimeout(() => {
      selectedItem.value = allItems.value.find(i => i.id === itemId) ?? null
      if (selectedItem.value) mobilePanel.value = 'detail'
    }, 0)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('bloqueado') || msg.includes('locked')) {
      // parent handles lock
    } else {
      saveError.value = 'Não foi possível guardar. Tente novamente.'
    }
  }
}

function handleEdit(item: ItemRow) {
  try {
    const json = cryptoStore.decryptItem(item.encryptedPayload)
    const payload = JSON.parse(json) as ItemPayload
    editingData.value = { id: item.id, title: item.title, itemType: item.itemType, payload, createdAt: item.createdAt }
    showForm.value = true
    mobilePanel.value = 'detail'
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

async function handleFavoriteToggle(id: string) {
  syncStore.toggleFavorite(id)
  await persistNow()
  const updated = allItems.value.find(i => i.id === id)
  if (updated && selectedItem.value?.id === id) selectedItem.value = updated
}
</script>

<style scoped>
.mobile-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto;
  overflow: hidden;
  position: relative;
}

.panel {
  grid-row: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.mobile-logo { font-weight: 700; font-size: 0.95rem; color: var(--color-accent); }

.sync-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sync-dot.connected    { background: var(--color-success); }
.sync-dot.connecting   { background: #f6ad55; }
.sync-dot.disconnected { background: var(--color-border); }
.sync-dot.error        { background: var(--color-danger); }

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
  transition: color 0.15s;
}
.bottom-tab.active { color: var(--color-accent); }
.bottom-tab:hover  { color: var(--color-text); }

.tab-label { font-size: 0.65rem; font-weight: 500; line-height: 1; }

.fab {
  position: fixed;
  right: 1.5rem;
  bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
  width: 54px; height: 54px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
  z-index: 50;
  transition: transform 0.15s, background 0.15s;
}
.fab:hover { background: var(--color-accent-hover); transform: scale(1.07); }
.fab:active { transform: scale(0.96); }

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

.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sync-title { font-size: 0.9rem; font-weight: 500; color: var(--color-text); }
.sync-hint  { font-size: 0.78rem; text-align: center; }

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

.save-toast {
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
