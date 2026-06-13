<template>
  <div class="item-list">
    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        placeholder="Buscar..."
        autocomplete="off"
      />
    </div>

    <!-- TIPOS section (Bitwarden-style) -->
    <div v-if="!search" class="section">
      <div class="section-header" @click="typesOpen = !typesOpen">
        <span class="section-title">TIPOS</span>
        <svg class="chevron" :class="{ open: typesOpen }" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <ul v-if="typesOpen" class="type-rows">
        <li
          v-for="t in typeRows"
          :key="t.value"
          :class="['type-row', { active: activeFilter === t.value }]"
          @click="toggleFilter(t.value)"
        >
          <span class="type-row-icon">{{ t.icon }}</span>
          <span class="type-row-label">{{ t.label }}</span>
          <span class="type-row-count">{{ t.count }}</span>
        </li>
      </ul>
    </div>

    <!-- Items section -->
    <div class="section section-items">
      <div class="section-header items-header">
        <span class="section-title">
          {{ activeFilter === 'all' ? 'TODOS' : typeRows.find(t => t.value === activeFilter)?.label.toUpperCase() }}
          <span class="section-count">({{ filtered.length }})</span>
        </span>
        <button v-if="activeFilter !== 'all'" class="btn-clear-filter" @click="activeFilter = 'all'" title="Limpar filtro">✕</button>
      </div>

      <div v-if="!filtered.length" class="empty">
        <p v-if="search">Sem resultados para "{{ search }}"</p>
        <p v-else-if="activeFilter !== 'all'">Sem itens nesta categoria</p>
        <p v-else>Cofre vazio. Toque no <strong>+</strong> para adicionar.</p>
      </div>

      <ul v-else class="items">
        <li
          v-for="item in filtered"
          :key="item.id"
          :class="['item', { selected: selectedId === item.id }]"
          @click="$emit('select', item)"
        >
          <span class="item-icon">{{ typeIcon(item.itemType) }}</span>
          <div class="item-info">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-type">{{ typeLabel(item.itemType) }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ItemRow, ItemType } from '@/types/vault'

const props = defineProps<{
  items: ItemRow[]
  selectedId?: string
}>()

defineEmits<{ select: [item: ItemRow] }>()

const search = ref('')
const activeFilter = ref<'all' | ItemType>('all')
const typesOpen = ref(true)

const TYPE_META = [
  { value: 'login' as ItemType,       icon: '🔑', label: 'Login' },
  { value: 'card' as ItemType,        icon: '💳', label: 'Cartão' },
  { value: 'secure_note' as ItemType, icon: '📝', label: 'Nota' },
]

const typeRows = computed(() =>
  TYPE_META.map((t) => ({
    ...t,
    count: props.items.filter((i) => i.itemType === t.value).length,
  })),
)

const filtered = computed(() => {
  let list = activeFilter.value === 'all'
    ? props.items
    : props.items.filter((i) => i.itemType === activeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((i) => i.title.toLowerCase().includes(q))
  }
  return list
})

function toggleFilter(type: ItemType) {
  activeFilter.value = activeFilter.value === type ? 'all' : type
}

function typeIcon(type: ItemRow['itemType']): string {
  return { login: '🔑', card: '💳', secure_note: '📝' }[type] ?? '•'
}

function typeLabel(type: ItemRow['itemType']): string {
  return { login: 'Login', card: 'Cartão', secure_note: 'Nota' }[type] ?? type
}
</script>

<style scoped>
.item-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-bar {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.search-bar input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.85rem;
  outline: none;
}

.search-bar input:focus { border-color: var(--color-accent); }

/* ── Sections ───────────────────────── */
.section {
  flex-shrink: 0;
}

.section-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.4rem;
  cursor: pointer;
  user-select: none;
}

.items-header {
  cursor: default;
  justify-content: space-between;
}

.section-title {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-accent);
  flex: 1;
}

.section-count {
  font-weight: 400;
  color: var(--color-text-muted);
}

.chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron.open { transform: rotate(180deg); }

.btn-clear-filter {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  line-height: 1.4;
}

/* ── Type rows ──────────────────────── */
.type-rows {
  list-style: none;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.type-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--color-border);
}

.type-row:last-child { border-bottom: none; }

.type-row:hover { background: var(--color-surface-2); }

.type-row.active {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.type-row-icon { font-size: 1rem; flex-shrink: 0; }

.type-row-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.type-row.active .type-row-label { color: var(--color-accent); }

.type-row-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
  min-width: 1.5rem;
  text-align: right;
}

/* ── Items ──────────────────────────── */
.empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}

.items {
  list-style: none;
  overflow-y: auto;
  flex: 1;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.1s;
}

.item:hover { background: var(--color-surface-2); }

.item.selected {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  border-left: 2px solid var(--color-accent);
}

.item-icon { font-size: 1.1rem; flex-shrink: 0; }

.item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-type {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}
</style>
