<template>
  <div :class="['vault-layout', { 'is-mobile': isMobileLayout }]">

    <!-- ── DESKTOP: Sidebar ── -->
    <aside v-if="!isMobileLayout" class="sidebar">
      <div class="sidebar-logo">
        <span>🔐</span>
        <span class="sidebar-title">Kryptua</span>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="f in filters"
          :key="f.value"
          :class="['nav-item', { active: activeFilter === f.value && !showSettings }]"
          @click="activeFilter = f.value; showSettings = false"
        >
          <span class="nav-icon">{{ f.icon }}</span>{{ f.label }}
        </button>
      </nav>
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

      <ItemList
        :items="filteredItems"
        :selected-id="selectedItem?.id"
        @select="onItemSelect"
        @add="showModal = true"
      />
    </section>

    <!-- ── DETALHE do item ── -->
    <section
      v-show="!isMobileLayout ? !showSettings : mobilePanel === 'detail'"
      class="detail-panel"
    >
      <!-- Botão voltar mobile -->
      <button v-if="isMobileLayout && mobilePanel === 'detail'" class="btn-back" @click="mobilePanel = 'list'">
        ← Voltar
      </button>
      <ItemDetail :item="selectedItem" @delete="handleDelete" />
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
        v-for="f in filters"
        :key="f.value"
        :class="['bottom-tab', { active: activeFilter === f.value && mobilePanel !== 'settings' }]"
        @click="activeFilter = f.value; mobilePanel = 'list'"
      >
        <span>{{ f.icon }}</span>
        <span class="tab-label">{{ f.label }}</span>
      </button>
      <button
        :class="['bottom-tab', { active: mobilePanel === 'settings' }]"
        @click="mobilePanel = 'settings'"
      >
        <span>⚙️</span>
        <span class="tab-label">Definições</span>
      </button>
      <button class="bottom-tab" @click="lock">
        <span>🔒</span>
        <span class="tab-label">Sair</span>
      </button>
    </nav>

    <AddItemModal v-if="showModal" @close="showModal = false; saveError = ''" @save="handleSave" />

    <!-- Erro de save (vault bloqueado, wasm, etc.) -->
    <div v-if="saveError" class="save-error-toast" @click="saveError = ''">
      ⚠️ {{ saveError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useDbStore } from '@/stores/db'
import { useSyncStore } from '@/stores/sync'
import { usePlatform } from '@/composables/usePlatform'
import ItemList from '@/components/ItemList.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import type { ItemRow, ItemPayload, ItemType, VaultMeta } from '@/types/vault'

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()
const syncStore = useSyncStore()
const { isNative } = usePlatform()

const selectedItem = ref<ItemRow | null>(null)
const showModal = ref(false)
const saveError = ref('')
const activeFilter = ref<'all' | ItemType>('all')
const mobilePanel = ref<'list' | 'detail' | 'settings'>('list')
const showSettings = ref(false) // desktop only

// Mobile: nativo Capacitor OU viewport estreito
const isMobileLayout = computed(() => isNative.value || window.innerWidth < 768)

const filters = [
  { value: 'all' as const,         icon: '🗂',  label: 'Todos' },
  { value: 'login' as const,       icon: '🔑',  label: 'Logins' },
  { value: 'card' as const,        icon: '💳',  label: 'Cartões' },
  { value: 'secure_note' as const, icon: '📝',  label: 'Notas' },
]

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
    encryptedPayload: i.blob,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }))
})

const filteredItems = computed(() =>
  activeFilter.value === 'all'
    ? allItems.value
    : allItems.value.filter((i) => i.itemType === activeFilter.value),
)

const vault = ref<VaultMeta | null>(null)

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

function onItemSelect(item: ItemRow) {
  selectedItem.value = item
  if (isMobileLayout.value) mobilePanel.value = 'detail'
}

async function handleSave(title: string, type: ItemType, payload: ItemPayload) {
  saveError.value = ''
  if (!vault.value) return
  try {
    const blob = cryptoStore.encryptItem(JSON.stringify(payload))
    const now = Date.now()
    const id = crypto.randomUUID()
    syncStore.addItem(id, { title, itemType: type, createdAt: now, updatedAt: now }, blob)
    // Persiste imediatamente após adicionar (não espera pelo debounce)
    await dbStore.saveYdocState(vault.value.id, syncStore.getDocState()!)
    showModal.value = false
    setTimeout(() => {
      selectedItem.value = allItems.value.find((i) => i.id === id) ?? null
      if (isMobileLayout.value && selectedItem.value) mobilePanel.value = 'detail'
    }, 0)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('bloqueado') || msg.includes('locked')) {
      saveError.value = 'Sessão expirada. Saia e volte a entrar.'
    } else {
      saveError.value = 'Não foi possível guardar. Tente novamente.'
    }
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

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0.5rem;
  gap: 0.25rem;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-align: left;
  transition: background 0.1s, color 0.1s;
}

.nav-item:hover { background: var(--color-surface-2); color: var(--color-text); }
.nav-item.active {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
  font-weight: 600;
}

.nav-icon { font-size: 1rem; }

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

.save-error-toast {
  position: fixed;
  bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
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
