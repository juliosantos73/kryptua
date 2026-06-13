<template>
  <div class="desktop">

    <!-- ── TOP BAR ── -->
    <header class="topbar">
      <div class="topbar-brand">
        <span class="brand-icon">🔐</span>
        <span class="brand-name">Kryptua</span>
      </div>

      <div class="topbar-search">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref="searchRef"
          v-model="search"
          type="search"
          placeholder="Buscar itens...  /"
          class="search-input"
          autocomplete="off"
          @keydown.escape="search = ''"
        />
      </div>

      <div class="topbar-right">
        <div :class="['sync-pill', syncStore.status]">
          <span class="sync-dot" />
          <span class="sync-label">{{ syncLabel }}</span>
        </div>
        <button class="btn-lock" title="Bloquear (Ctrl+L)" @click="$emit('lock')">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Bloquear
        </button>
      </div>
    </header>

    <div class="desktop-body">

      <!-- ── LEFT NAV ── -->
      <nav class="leftnav">
        <!-- Preferidas -->
        <div
          :class="['nav-item', { active: activeFilter === 'favorites' }]"
          @click="setFilter('favorites')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" :fill="activeFilter === 'favorites' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span class="nav-label">Preferidas</span>
          <span v-if="favCount" class="nav-count">{{ favCount }}</span>
        </div>

        <div class="nav-divider" />

        <!-- Tipos -->
        <div class="nav-section-title">TIPOS</div>
        <div
          :class="['nav-item', { active: activeFilter === 'all' }]"
          @click="setFilter('all')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span class="nav-label">Todos</span>
          <span class="nav-count">{{ allItems.length }}</span>
        </div>
        <div
          v-for="schema in schemas"
          :key="schema.id"
          :class="['nav-item', { active: activeFilter === schema.id }]"
          @click="setFilter(schema.id)"
        >
          <span class="nav-icon-emoji">{{ schema.icon }}</span>
          <span class="nav-label">{{ schema.name }}</span>
          <span v-if="countByType[schema.id]" class="nav-count">{{ countByType[schema.id] }}</span>
        </div>

        <div class="nav-spacer" />
        <div class="nav-divider" />

        <!-- Settings -->
        <div
          :class="['nav-item', { active: showSettings }]"
          @click="toggleSettings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="nav-label">Definições</span>
        </div>
      </nav>

      <!-- ── CENTER: item list ── -->
      <section class="list-panel">
        <div class="list-header">
          <span class="list-title">
            {{ filterLabel }}
            <span class="list-count">{{ filtered.length }}</span>
          </span>
          <button class="btn-new" title="Novo item  N" @click="openForm()">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo
          </button>
        </div>

        <div v-if="offlineTooLong" class="offline-banner">
          Sem ligação — dados locais
        </div>

        <div v-if="syncLoading" class="list-loading">
          <div class="spinner" />
        </div>

        <ul v-else-if="filtered.length" class="items">
          <li
            v-for="item in filtered"
            :key="item.id"
            :class="['item-row', { selected: selectedItem?.id === item.id }]"
            @click="selectItem(item)"
          >
            <span class="item-type-icon">{{ schemaIcon(item.itemType) }}</span>
            <div class="item-body">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-sub">{{ schemaName(item.itemType) }}</span>
            </div>
            <svg v-if="item.isFavorite" class="item-fav" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </li>
        </ul>

        <div v-else class="list-empty">
          <p v-if="search">Sem resultados para "{{ search }}"</p>
          <p v-else-if="activeFilter === 'favorites'">Nenhum item marcado como preferido</p>
          <p v-else-if="activeFilter !== 'all'">Nenhum item nesta categoria</p>
          <p v-else>Cofre vazio — prima <kbd>N</kbd> para adicionar</p>
        </div>
      </section>

      <!-- ── RIGHT PANEL ── -->
      <section class="right-panel">
        <!-- Settings overlay -->
        <transition name="slide-right">
          <div v-if="showSettings" class="settings-overlay">
            <div class="settings-overlay-header">
              <span>Definições</span>
              <button class="btn-close-overlay" @click="showSettings = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="settings-overlay-body">
              <SettingsPanel />
            </div>
          </div>
        </transition>

        <!-- Form or Detail (always behind settings if open) -->
        <AddItemModal
          v-if="showForm"
          :schemas="schemas"
          :edit-data="editingData ?? undefined"
          @cancel="cancelForm"
          @save="handleSave"
        />
        <ItemDetail
          v-else-if="selectedItem && !showSettings"
          :item="selectedItem"
          :schemas="schemas"
          @delete="handleDelete"
          @edit="handleEdit"
          @favorite="handleFavoriteToggle"
        />
        <div v-else-if="!showSettings" class="right-empty">
          <div class="right-empty-inner">
            <span class="right-empty-icon">🔐</span>
            <p>Selecione um item ou prima <kbd>N</kbd> para criar</p>
            <p class="right-empty-hints">
              <kbd>/</kbd> Buscar &nbsp;·&nbsp;
              <kbd>N</kbd> Novo &nbsp;·&nbsp;
              <kbd>Esc</kbd> Fechar
            </p>
          </div>
        </div>
      </section>

    </div>

    <div v-if="saveError" class="save-toast" @click="saveError = ''">⚠️ {{ saveError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount, inject } from 'vue'
import type { Ref } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useSyncStore } from '@/stores/sync'
import { useTypeSchemas } from '@/composables/useTypeSchemas'
import type { ItemRow, ItemPayload, VaultMeta } from '@/types/vault'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

defineEmits<{ lock: [] }>()

const vault = inject<Ref<VaultMeta | null>>('vault')!
const persistNow = inject<() => Promise<void>>('persistNow')!

const cryptoStore = useCryptoStore()
const syncStore = useSyncStore()
const { schemas } = useTypeSchemas()

// ── State ──────────────────────────────────────────────────────────────────
const searchRef = ref<HTMLInputElement | null>(null)
const search = ref('')
const activeFilter = ref<'all' | 'favorites' | string>('all')
const selectedItem = ref<ItemRow | null>(null)
const showForm = ref(false)
const showSettings = ref(false)
const editingData = ref<{ id: string; title: string; itemType: string; payload: ItemPayload; createdAt: number } | null>(null)
const saveError = ref('')

// ── Computed ───────────────────────────────────────────────────────────────
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

const favCount = computed(() => allItems.value.filter(i => i.isFavorite).length)

const countByType = computed(() => {
  const m: Record<string, number> = {}
  for (const i of allItems.value) m[i.itemType] = (m[i.itemType] ?? 0) + 1
  return m
})

const filtered = computed(() => {
  let list: ItemRow[]
  if (activeFilter.value === 'favorites') {
    list = allItems.value.filter(i => i.isFavorite)
  } else if (activeFilter.value === 'all') {
    list = allItems.value
  } else {
    list = allItems.value.filter(i => i.itemType === activeFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(i => i.title.toLowerCase().includes(q))
  }
  return list
})

const filterLabel = computed(() => {
  if (activeFilter.value === 'favorites') return 'Preferidas'
  if (activeFilter.value === 'all') return 'Todos'
  return schemas.value.find(s => s.id === activeFilter.value)?.name ?? activeFilter.value
})

function schemaIcon(id: string) { return schemas.value.find(s => s.id === id)?.icon ?? '•' }
function schemaName(id: string) { return schemas.value.find(s => s.id === id)?.name ?? id }

// ── Navigation ─────────────────────────────────────────────────────────────
function setFilter(f: string) {
  activeFilter.value = activeFilter.value === f && f !== 'all' ? 'all' : f
  showSettings.value = false
}

function toggleSettings() {
  showSettings.value = !showSettings.value
  if (showSettings.value) showForm.value = false
}

// ── Item actions ───────────────────────────────────────────────────────────
function selectItem(item: ItemRow) {
  selectedItem.value = item
  showForm.value = false
  editingData.value = null
  showSettings.value = false
}

function openForm() {
  editingData.value = null
  showForm.value = true
  showSettings.value = false
}

function cancelForm() {
  showForm.value = false
  editingData.value = null
  saveError.value = ''
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
    setTimeout(() => { selectedItem.value = allItems.value.find(i => i.id === itemId) ?? null }, 0)
  } catch {
    saveError.value = 'Não foi possível guardar. Tente novamente.'
  }
}

function handleEdit(item: ItemRow) {
  try {
    const json = cryptoStore.decryptItem(item.encryptedPayload)
    const payload = JSON.parse(json) as ItemPayload
    editingData.value = { id: item.id, title: item.title, itemType: item.itemType, payload, createdAt: item.createdAt }
    showForm.value = true
    showSettings.value = false
  } catch {
    saveError.value = 'Não foi possível abrir o item para edição.'
  }
}

function handleDelete(id: string) {
  syncStore.deleteItem(id)
  if (selectedItem.value?.id === id) selectedItem.value = null
}

async function handleFavoriteToggle(id: string) {
  syncStore.toggleFavorite(id)
  await persistNow()
  const updated = allItems.value.find(i => i.id === id)
  if (updated && selectedItem.value?.id === id) selectedItem.value = updated
}

// Keep selectedItem in sync if it gets deleted
watch(allItems, (items) => {
  if (selectedItem.value && !items.find(i => i.id === selectedItem.value!.id)) {
    selectedItem.value = null
  }
})

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

  // / or Ctrl+K → focus search
  if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !inInput) {
    e.preventDefault()
    searchRef.value?.focus()
    searchRef.value?.select()
    return
  }

  if (inInput) return

  // N → new item
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openForm(); return }

  // Ctrl+L → lock
  if (e.ctrlKey && e.key === 'l') { e.preventDefault(); /* emitted below via keydown.ctrl.l */ return }

  // Escape → close form / settings / deselect
  if (e.key === 'Escape') {
    if (showForm.value) { cancelForm(); return }
    if (showSettings.value) { showSettings.value = false; return }
    if (search.value) { search.value = ''; return }
    selectedItem.value = null
    return
  }

  // ↑ / ↓ → navigate list
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const list = filtered.value
    if (!list.length) return
    const idx = list.findIndex(i => i.id === selectedItem.value?.id)
    const next = e.key === 'ArrowDown'
      ? Math.min(idx + 1, list.length - 1)
      : Math.max(idx - 1, 0)
    selectItem(list[next])
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.desktop {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Top bar ─────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 48px;
  padding: 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 10;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 200px;
  flex-shrink: 0;
}

.brand-icon { font-size: 1.1rem; }
.brand-name { font-weight: 700; font-size: 0.95rem; color: var(--color-accent); }

.topbar-search {
  flex: 1;
  max-width: 480px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.45rem 0.75rem 0.45rem 2.1rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--color-accent); }

.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sync-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
}

.sync-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.sync-pill.connected    { color: var(--color-success); }
.sync-pill.connecting   { color: #f6ad55; }
.sync-pill.disconnected { color: var(--color-text-muted); }
.sync-pill.error        { color: var(--color-danger); }

.sync-label { white-space: nowrap; }

.btn-lock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  transition: all 0.15s;
}
.btn-lock:hover { border-color: var(--color-danger); color: var(--color-danger); }

/* ── Body ───────────────────────────────────────────────────────── */
.desktop-body {
  flex: 1;
  display: grid;
  grid-template-columns: 200px 300px 1fr;
  min-height: 0;
  overflow: hidden;
}

/* ── Left nav ───────────────────────────────────────────────────── */
.leftnav {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 0.5rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
  border-radius: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  transition: background 0.1s, color 0.1s;
  user-select: none;
}
.nav-item:hover { background: var(--color-surface-2); color: var(--color-text); }
.nav-item.active { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); font-weight: 500; }

.nav-icon-emoji { font-size: 1rem; flex-shrink: 0; width: 15px; text-align: center; }
.nav-label { flex: 1; }
.nav-count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  min-width: 1.4rem;
  text-align: center;
  font-weight: 500;
}
.nav-item.active .nav-count { background: color-mix(in srgb, var(--color-accent) 18%, transparent); color: var(--color-accent); }

.nav-divider { height: 1px; background: var(--color-border); margin: 0.35rem 0; }
.nav-spacer { flex: 1; }

.nav-section-title {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  color: var(--color-text-muted);
  padding: 0.25rem 0.85rem 0.1rem;
}

/* ── Center list ────────────────────────────────────────────────── */
.list-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.list-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.list-count {
  font-size: 0.72rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  font-weight: 400;
  color: var(--color-text-muted);
  text-transform: none;
  letter-spacing: 0;
}

.btn-new {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-new:hover { background: var(--color-accent-hover); }

.items { list-style: none; overflow-y: auto; flex: 1; }

.item-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.85rem;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  transition: background 0.1s;
}
.item-row:hover { background: var(--color-surface-2); }
.item-row.selected {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-left: 2px solid var(--color-accent);
}

.item-type-icon { font-size: 1rem; flex-shrink: 0; }

.item-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }

.item-title { font-size: 0.875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub   { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.05rem; }

.item-fav { flex-shrink: 0; color: #d97706; }

.list-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-align: center;
  line-height: 1.6;
}

.list-loading { flex: 1; display: flex; align-items: center; justify-content: center; }

@keyframes spin { to { transform: rotate(360deg); } }

.spinner {
  width: 24px; height: 24px;
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Right panel ────────────────────────────────────────────────── */
.right-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.right-empty-icon { font-size: 3rem; opacity: 0.3; }

.right-empty-hints {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.35rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

/* Settings overlay (slides in from right) */
.settings-overlay {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  z-index: 20;
  border-left: 1px solid var(--color-border);
}

.settings-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.95rem;
  font-weight: 600;
  flex-shrink: 0;
}

.btn-close-overlay {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}
.btn-close-overlay:hover { color: var(--color-text); }

.settings-overlay-body { flex: 1; overflow-y: auto; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(20px); opacity: 0; }

/* Offline banner */
.offline-banner {
  background: color-mix(in srgb, #f6ad55 15%, transparent);
  border-bottom: 1px solid #f6ad55;
  color: #c07a2a;
  font-size: 0.75rem;
  padding: 0.3rem 0.85rem;
  flex-shrink: 0;
}

.save-toast {
  position: fixed;
  bottom: 1.5rem;
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
