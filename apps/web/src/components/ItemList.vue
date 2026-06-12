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

    <div class="list-header">
      <span class="count">{{ filtered.length }} itens</span>
      <button class="btn-add" @click="$emit('add')">+ Novo</button>
    </div>

    <div v-if="!filtered.length" class="empty">
      <p v-if="search">Nenhum resultado para "{{ search }}"</p>
      <p v-else>Nenhum item. Clique em <strong>+ Novo</strong> para começar.</p>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ItemRow } from '@/types/vault'

const props = defineProps<{
  items: ItemRow[]
  selectedId?: string
}>()

defineEmits<{
  select: [item: ItemRow]
  add: []
}>()

const search = ref('')

const filtered = computed(() =>
  search.value
    ? props.items.filter((i) =>
        i.title.toLowerCase().includes(search.value.toLowerCase()),
      )
    : props.items,
)

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

.search-bar input:focus {
  border-color: var(--color-accent);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.btn-add {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  transition: background 0.15s;
}

.btn-add:hover {
  background: var(--color-accent-hover);
}

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

.item:hover {
  background: var(--color-surface-2);
}

.item.selected {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  border-left: 2px solid var(--color-accent);
}

.item-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

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
