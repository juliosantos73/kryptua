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
      <ItemDetail
        :item="selectedItem"
        @delete="handleDelete"
      />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'
import { useDbStore } from '@/stores/db'
import ItemList from '@/components/ItemList.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import type { ItemRow, ItemPayload, ItemType } from '@/types/vault'

const router = useRouter()
const cryptoStore = useCryptoStore()
const dbStore = useDbStore()

const items = ref<ItemRow[]>([])
const selectedItem = ref<ItemRow | null>(null)
const showModal = ref(false)
const activeFilter = ref<'all' | ItemType>('all')

const filters = [
  { value: 'all' as const,         icon: '🗂',  label: 'Todos' },
  { value: 'login' as const,       icon: '🔑',  label: 'Logins' },
  { value: 'card' as const,        icon: '💳',  label: 'Cartões' },
  { value: 'secure_note' as const, icon: '📝',  label: 'Notas' },
]

const filteredItems = computed(() =>
  activeFilter.value === 'all'
    ? items.value
    : items.value.filter((i) => i.itemType === activeFilter.value),
)

onMounted(() => loadItems())

function loadItems() {
  const vault = dbStore.loadVault()
  if (!vault) { router.replace({ name: 'unlock' }); return }
  items.value = dbStore.listItems(vault.id)
}

function handleSave(title: string, type: ItemType, payload: ItemPayload) {
  const vault = dbStore.loadVault()
  if (!vault) return

  const blob = cryptoStore.encryptItem(JSON.stringify(payload))
  const now = Date.now()
  const item: ItemRow = {
    id: crypto.randomUUID(),
    vaultId: vault.id,
    itemType: type,
    title,
    encryptedPayload: blob,
    createdAt: now,
    updatedAt: now,
  }

  dbStore.saveItem(item)
  loadItems()
  selectedItem.value = items.value.find((i) => i.id === item.id) ?? null
  showModal.value = false
}

function handleDelete(id: string) {
  dbStore.deleteItem(id)
  if (selectedItem.value?.id === id) selectedItem.value = null
  loadItems()
}

function lock() {
  cryptoStore.lock()
  router.push({ name: 'unlock' })
}
</script>

<style scoped>
.vault-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 200px 280px 1fr;
  grid-template-rows: 1fr;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1.1rem 1rem;
  font-size: 1.1rem;
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

.nav-item:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.nav-item.active {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
  font-weight: 600;
}

.nav-icon {
  font-size: 1rem;
}

.sidebar-footer {
  padding: 0.75rem 0.5rem;
  border-top: 1px solid var(--color-border);
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

.btn-lock:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* Paineis */
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
