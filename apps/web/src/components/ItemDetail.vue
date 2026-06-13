<template>
  <div v-if="!item" class="empty-state">
    <p>Selecione um item ou crie um novo</p>
  </div>

  <div v-else class="detail">
    <div class="detail-header">
      <div class="detail-title">
        <span class="type-icon">{{ schemaIcon }}</span>
        <h2>{{ item.title }}</h2>
      </div>
      <div v-if="confirmDelete" class="confirm-strip">
        <span>Apagar?</span>
        <button class="btn-confirm-yes" @click="$emit('delete', item.id)">Sim</button>
        <button class="btn-confirm-no" @click="confirmDelete = false">Não</button>
      </div>
      <div v-else class="detail-actions">
        <!-- Favorite / bookmark -->
        <button
          :class="['btn-fav', { on: item.isFavorite }]"
          :title="item.isFavorite ? 'Remover dos preferidos' : 'Adicionar aos preferidos'"
          @click="$emit('favorite', item.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" :fill="item.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="btn-edit" @click="$emit('edit', item)" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-delete" @click="confirmDelete = true" title="Apagar">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>

    <!-- Card visual preview -->
    <div v-if="payload && item?.itemType === 'card'" class="card-visual">
      <div class="card-top">
        <svg class="chip" viewBox="0 0 38 28" fill="none">
          <rect width="38" height="28" rx="4" fill="#c9a227"/>
          <rect y="9" width="38" height="10" fill="rgba(0,0,0,0.18)"/>
          <line x1="12" y1="0" x2="12" y2="28" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
          <line x1="26" y1="0" x2="26" y2="28" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
          <rect x="12" y="9" width="14" height="10" fill="rgba(255,255,255,0.08)"/>
        </svg>
        <svg class="contactless" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
          <path d="M5.6 12a6.4 6.4 0 0 1 12.8 0" stroke-linecap="round"/>
          <path d="M8.8 12a3.2 3.2 0 0 1 6.4 0" stroke-linecap="round"/>
          <path d="M12 12h.01" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="card-number-display">{{ displayCardNumber }}</div>
      <div class="card-bottom">
        <div class="card-info">
          <span class="card-info-label">TITULAR</span>
          <span class="card-info-value">{{ (payload.data.holder || 'NOME DO TITULAR').toUpperCase() }}</span>
        </div>
        <div class="card-info card-info-right">
          <span class="card-info-label">VALIDADE</span>
          <span class="card-info-value">{{ payload.data.expiry || '••/••' }}</span>
        </div>
      </div>
    </div>

    <div v-if="payload" class="fields">
      <template v-if="currentSchema">
        <Field
          v-for="field in currentSchema.fields"
          :key="field.key"
          :label="field.label"
          :value="String(payload.data[field.key] ?? '')"
          :copyable="field.copyable"
          :secret="field.masked"
          :multiline="field.fieldType === 'textarea'"
        />
      </template>
      <!-- Fallback: unknown type, display all data keys -->
      <template v-else>
        <Field
          v-for="(value, key) in payload.data"
          :key="key"
          :label="String(key)"
          :value="String(value ?? '')"
          copyable
        />
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
import type { TypeSchema } from '@/types/schema'
import { useCryptoStore } from '@/stores/crypto'
import Field from './Field.vue'

const props = defineProps<{
  item: ItemRow | null
  schemas: TypeSchema[]
}>()

defineEmits<{
  delete: [id: string]
  edit: [item: ItemRow]
  favorite: [id: string]
}>()

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
      loadError.value = 'Não foi possível decriptar este item.'
    }
  },
  { immediate: true },
)

const currentSchema = computed(() =>
  props.item ? props.schemas.find(s => s.id === props.item!.itemType) : undefined,
)

const schemaIcon = computed(() => currentSchema.value?.icon ?? '•')

const displayCardNumber = computed(() => {
  const digits = (payload.value?.data.number ?? '').replace(/\D/g, '')
  const groups = []
  for (let i = 0; i < 4; i++) {
    const chunk = digits.slice(i * 4, i * 4 + 4)
    groups.push(chunk.padEnd(4, '•'))
  }
  return groups.join('  ')
})

const formattedDate = computed(() =>
  props.item ? new Date(props.item.updatedAt).toLocaleString('pt-BR') : '',
)
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

.type-icon { font-size: 1.5rem; flex-shrink: 0; }

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

.btn-fav, .btn-edit, .btn-delete {
  padding: 0.4rem 0.65rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  border-right: 1px solid var(--color-border);
}
.btn-delete { border-right: none; }

.btn-fav:hover, .btn-fav.on {
  background: color-mix(in srgb, #f6ad55 12%, transparent);
  color: #c07a2a;
}
.btn-fav.on { color: #d97706; }

.btn-edit:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
}

.btn-delete:hover {
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
}

.error { padding: 1rem 1.5rem; color: var(--color-danger); font-size: 0.85rem; }

.fields {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-footer { padding: 0.75rem 1.5rem; border-top: 1px solid var(--color-border); }

.ts { font-size: 0.75rem; color: var(--color-text-muted); }

/* ── Card visual ── */
.card-visual {
  border-radius: 14px;
  background: linear-gradient(135deg, #7c74ff 0%, #5247d0 45%, #1a1d3e 100%);
  padding: 1.1rem 1.25rem 1rem;
  margin: 1rem 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(108, 99, 255, 0.35);
  flex-shrink: 0;
}
.card-visual::before {
  content: '';
  position: absolute;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  top: -80px; right: -50px;
  pointer-events: none;
}
.card-visual::after {
  content: '';
  position: absolute;
  width: 130px; height: 130px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  bottom: -50px; left: 20px;
  pointer-events: none;
}
.card-top { display: flex; align-items: flex-start; justify-content: space-between; }
.chip { width: 38px; height: 28px; flex-shrink: 0; }
.contactless { width: 24px; height: 24px; opacity: 0.7; }
.card-number-display {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  margin: 0.1rem 0;
}
.card-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
.card-info { display: flex; flex-direction: column; gap: 0.1rem; }
.card-info-right { text-align: right; }
.card-info-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.1em; color: rgba(255,255,255,0.55); text-transform: uppercase; }
.card-info-value { font-size: 0.78rem; font-weight: 500; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
</style>
