<template>
  <div v-if="!item" class="empty-state">
    <p>Selecione um item ou crie um novo</p>
  </div>

  <div v-else class="detail">
    <div class="detail-header">
      <div class="detail-title">
        <span class="type-icon">{{ typeIcon }}</span>
        <h2>{{ item.title }}</h2>
      </div>
      <div v-if="confirmDelete" class="confirm-strip">
        <span>Apagar?</span>
        <button class="btn-confirm-yes" @click="$emit('delete', item.id)">Sim</button>
        <button class="btn-confirm-no" @click="confirmDelete = false">Não</button>
      </div>
      <div v-else class="detail-actions">
        <button class="btn-edit" @click="$emit('edit', item)" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-delete" @click="confirmDelete = true" title="Apagar">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <div v-else-if="payload" class="fields">
      <!-- Login -->
      <template v-if="payload.type === 'login'">
        <Field label="Usuário" :value="payload.data.username" copyable />
        <Field label="Senha" :value="payload.data.password" copyable secret />
        <Field label="URL" :value="payload.data.url" copyable />
        <Field v-if="payload.data.notes" label="Notas" :value="payload.data.notes" />
      </template>

      <!-- Cartão -->
      <template v-else-if="payload.type === 'card'">
        <Field label="Número" :value="payload.data.number" copyable secret />
        <Field label="Titular" :value="payload.data.holder" copyable />
        <Field label="Validade" :value="payload.data.expiry" copyable />
        <Field label="CVV" :value="payload.data.cvv" copyable secret />
        <Field v-if="payload.data.pin" label="PIN" :value="payload.data.pin" copyable secret />
        <Field v-if="payload.data.notes" label="Notas" :value="payload.data.notes" />
      </template>

      <!-- Nota -->
      <template v-else-if="payload.type === 'secure_note'">
        <Field label="Conteúdo" :value="payload.data.content" multiline />
      </template>
    </div>

    <div class="detail-footer">
      <span class="ts">Atualizado {{ formattedDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ItemRow, ItemPayload } from '@/types/vault'
import { useCryptoStore } from '@/stores/crypto'
import Field from './Field.vue'

const props = defineProps<{ item: ItemRow | null }>()
defineEmits<{ delete: [id: string]; edit: [item: ItemRow] }>()

const cryptoStore = useCryptoStore()
const payload = ref<ItemPayload | null>(null)
const loadError = ref('')
const confirmDelete = ref(false)

watch(
  () => props.item,
  (item) => {
    payload.value = null
    loadError.value = ''
    confirmDelete.value = false
    if (!item) return
    try {
      const json = cryptoStore.decryptItem(item.encryptedPayload)
      payload.value = JSON.parse(json) as ItemPayload
    } catch {
      loadError.value = 'Não foi possível decriptar este item. Verifique se a Master Password é a mesma do dispositivo de origem.'
    }
  },
  { immediate: true },
)

const typeIcon = computed(() => {
  const icons: Record<string, string> = { login: '🔑', card: '💳', secure_note: '📝' }
  return props.item ? icons[props.item.itemType] ?? '•' : ''
})

const formattedDate = computed(() => {
  if (!props.item) return ''
  return new Date(props.item.updatedAt).toLocaleString('pt-BR')
})
</script>

<style scoped>
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  gap: 0.75rem;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.type-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

h2 {
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.confirm-strip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--color-danger);
  font-weight: 500;
}

.btn-confirm-yes {
  padding: 0.35rem 0.65rem;
  background: var(--color-danger);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 0.8rem;
  font-weight: 600;
  transition: opacity 0.15s;
}

.btn-confirm-yes:hover { opacity: 0.85; }

.btn-confirm-no {
  padding: 0.35rem 0.65rem;
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.8rem;
  transition: border-color 0.15s, color 0.15s;
}

.btn-confirm-no:hover { border-color: var(--color-text-muted); color: var(--color-text); }

.detail-actions {
  display: flex;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.btn-edit, .btn-delete {
  padding: 0.4rem 0.65rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.btn-edit {
  border-right: 1px solid var(--color-border);
}

.btn-edit:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
}

.btn-delete:hover {
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
}

.error {
  padding: 1rem 1.5rem;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.fields {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-footer {
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.ts {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
