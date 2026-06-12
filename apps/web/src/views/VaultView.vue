<template>
  <div class="vault-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span>🔐</span>
        <span class="sidebar-title">Kryptua</span>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="f in filters"
          :key="f.value"
          :class="['nav-item', { active: activeFilter === f.value }]"
          @click="activeFilter = f.value"
        >
          <span class="nav-icon">{{ f.icon }}</span>
          {{ f.label }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <div :class="['sync-status', syncStore.status]">
          <span class="sync-dot" />
          {{ syncLabel }}
        </div>
        <button class="btn-lock" @click="lock">🔒 Bloquear</button>
      </div>
    </aside>

    <!-- Lista de itens -->
    <section class="list-panel">
      <ItemList
        :items="filteredItems"
        :selected-id="selectedItem?.id"
        @select="selectedItem = $event"
        @add="showModal = true"
      />
    </section>

    <!-- Detalhe do item -->
    <section class="detail-panel">
      <ItemDetail :item="selectedItem" @delete="handleDelete" />
    </section>

    <!-- Modal de criação -->
    <AddItemModal
      v-if="showModal"
      @close="showModal = false"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useDbStore } from '@/stores/db'
import { useSyncStore } from '@/stores/sync'
import ItemList from '@/components/ItemList.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import type { ItemRow, ItemPayload, ItemType } from '@/types/vault'

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()
const syncStore = useSyncStore()

const selectedItem = ref<ItemRow | null>(null)
const showModal = ref(false)
const activeFilter = ref<'all' | ItemType>('all')

const filters = [
  { value: 'all' as const,         icon: '🗂',  label: 'Todos' },
  { value: 'login' as const,       icon: '🔑',  label: 'Logins' },
  { value: 'card' as const,        icon: '💳',  label: 'Cartões' },
  { value: 'secure_note' as const, icon: '📝',  label: 'Notas' },
]

const syncLabel = computed(() => ({
  connected:    '● Sincronizado',
  connecting:   '◌ Conectando...',
  disconnected: '○ Offline',
  error:        '✕ Erro sync',
}[syncStore.status]))

// Items derivados do Yjs — re-computados a cada update via `version`
const allItems = computed<ItemRow[]>(() => {
  void syncStore.version // tracking de dependência reativo
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

const vault = ref<ReturnType<typeof dbStore.loadVault>>(null)

// Persiste o estado Yjs no SQLite sempre que o doc muda (debounced 500ms)
let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const state = syncStore.getDocState()
    if (state && vault.value) {
      dbStore.saveYdocState(vault.value.id, state)
    }
  }, 500)
}

onMounted(async () => {
  await dbStore.init()
  vault.value = dbStore.loadVault()
  if (!vault.value) { router.replace({ name: 'unlock' }); return }

  const savedState = dbStore.loadYdocState(vault.value.id)
  syncStore.init(vault.value.id, savedState ?? undefined)

  // Persiste no SQLite a cada update do Yjs
  const doc = syncStore.ydoc
  if (doc) {
    doc.on('update', schedulePersist)
  }
})

onUnmounted(() => {
  if (persistTimer) clearTimeout(persistTimer)
  syncStore.destroy()
})

// Deseleciona item se ele for apagado por outro dispositivo
watch(allItems, (items) => {
  if (selectedItem.value && !items.find((i) => i.id === selectedItem.value!.id)) {
    selectedItem.value = null
  }
})

function handleSave(title: string, type: ItemType, payload: ItemPayload): void {
  if (!vault.value) return

  const blob = cryptoStore.encryptItem(JSON.stringify(payload))
  const now = Date.now()
  const id = crypto.randomUUID()

  syncStore.addItem(id, { title, itemType: type, createdAt: now, updatedAt: now }, blob)
  // Seleciona o novo item após o Vue re-renderizar
  setTimeout(() => {
    selectedItem.value = allItems.value.find((i) => i.id === id) ?? null
  }, 0)
  showModal.value = false
}

function handleDelete(id: string): void {
  syncStore.deleteItem(id)
  if (selectedItem.value?.id === id) selectedItem.value = null
}

function lock(): void {
  syncStore.destroy()
  cryptoStore.lock()
  router.push({ name: 'unlock' })
}
</script>

<style scoped>
.vault-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 200px 280px 1fr;
  overflow: hidden;
}

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
}

.sidebar-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-accent);
}

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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
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

.list-panel {
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-panel {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}
</style>
