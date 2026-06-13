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
      <button class="btn-delete" @click="$emit('delete', item.id)" title="Apagar">✕</button>
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
defineEmits<{ delete: [id: string] }>()

const cryptoStore = useCryptoStore()
const payload = ref<ItemPayload | null>(null)
const loadError = ref('')

watch(
  () => props.item,
  (item) => {
    payload.value = null
    loadError.value = ''
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

.btn-delete {
  flex-shrink: 0;
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}

.btn-delete:hover {
  border-color: var(--color-danger);
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
