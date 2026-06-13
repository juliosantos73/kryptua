<template>
  <div class="item-panel">

    <!-- Header: type selector -->
    <div class="panel-header">
      <div class="type-tabs">
        <button
          v-for="s in schemas"
          :key="s.id"
          type="button"
          :class="['tab', { active: form.typeId === s.id }]"
          :disabled="isEditing"
          @click="selectType(s.id)"
        >
          {{ s.icon }} {{ s.name }}
        </button>
      </div>
      <button class="btn-close" type="button" @click="$emit('cancel')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <form id="modal-form" @submit.prevent="handleSave">

      <!-- Title always first -->
      <div class="field">
        <label for="item-title">Título</label>
        <input id="item-title" v-model="form.title" type="text" :placeholder="currentSchema?.name ?? 'Título'" required />
      </div>

      <!-- ── CARTÃO: visual preview + special layout ── -->
      <template v-if="form.typeId === 'card'">
        <div class="card-visual">
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
              <span class="card-info-value">{{ (form.data.holder || 'NOME DO TITULAR').toUpperCase() }}</span>
            </div>
            <div class="card-info card-info-right">
              <span class="card-info-label">VALIDADE</span>
              <span class="card-info-value">{{ form.data.expiry || 'MM/AA' }}</span>
            </div>
          </div>
        </div>

        <div class="card-fields">
          <div class="field">
            <label>Número</label>
            <input
              :value="form.data.number"
              type="text" inputmode="numeric" autocomplete="cc-number" maxlength="19"
              placeholder="0000 0000 0000 0000"
              class="input-mono"
              @input="onCardNumberInput"
            />
          </div>
          <div class="field">
            <label>Titular</label>
            <input v-model="form.data.holder" type="text" autocomplete="cc-name" placeholder="Nome como no cartão" />
          </div>
          <div class="row-2">
            <div class="field">
              <label>Validade</label>
              <input :value="form.data.expiry" type="text" inputmode="numeric" placeholder="MM/AA" maxlength="5" @input="onExpiryInput" />
            </div>
            <div class="field">
              <label>CVV</label>
              <PasswordInput v-model="form.data.cvv" placeholder="•••" autocomplete="cc-csc" />
            </div>
          </div>
          <div class="field">
            <label>PIN</label>
            <PasswordInput v-model="form.data.pin" placeholder="PIN do cartão" autocomplete="off" />
          </div>
          <div class="field">
            <label>Notas</label>
            <textarea v-model="form.data.notes" rows="2" placeholder="Observações opcionais..." />
          </div>
        </div>
      </template>

      <!-- ── TODOS OS OUTROS TIPOS: formulário dinâmico ── -->
      <template v-else>
        <template v-for="field in currentSchema?.fields ?? []" :key="field.key">
          <div :class="['field', { 'field-fill': isLastTextarea(field) }]">
            <label>{{ field.label }}</label>

            <PasswordInput
              v-if="field.fieldType === 'password' || field.fieldType === 'pin'"
              v-model="form.data[field.key]"
              :placeholder="field.placeholder"
              :generateable="field.fieldType === 'password'"
              autocomplete="new-password"
              @generate="field.fieldType === 'password' && (form.data[field.key] = generatePassword())"
            />

            <textarea
              v-else-if="field.fieldType === 'textarea'"
              v-model="form.data[field.key]"
              :placeholder="field.placeholder"
              :class="{ 'area-fill': isLastTextarea(field), 'note-mono': currentSchema?.id === 'secure_note' }"
            />

            <input
              v-else
              v-model="form.data[field.key]"
              :type="inputType(field.fieldType)"
              :placeholder="field.placeholder"
              autocomplete="off"
            />

            <!-- Strength bar right after password field -->
            <div v-if="field.fieldType === 'password' && form.data[field.key]" class="strength-bar-wrap">
              <div class="strength-track">
                <div class="strength-bar" :style="{ width: strength.pct + '%', background: strength.color }" />
              </div>
              <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
            </div>
          </div>
        </template>
      </template>

      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <div class="panel-footer">
      <button type="button" class="btn-ghost" @click="$emit('cancel')">Cancelar</button>
      <button type="submit" form="modal-form" class="btn-primary">{{ isEditing ? 'Atualizar' : 'Salvar' }}</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import type { ItemPayload } from '@/types/vault'
import type { TypeSchema, FieldDef, FieldType } from '@/types/schema'
import PasswordInput from './PasswordInput.vue'
import { generatePassword, passwordStrength } from '@/composables/usePasswordGenerator'

interface EditData {
  id: string
  title: string
  itemType: string
  payload: ItemPayload
  createdAt: number
}

const props = defineProps<{
  schemas: TypeSchema[]
  editData?: EditData
}>()

const isEditing = computed(() => !!props.editData)

const emit = defineEmits<{
  cancel: []
  save: [id: string | null, title: string, typeId: string, payload: ItemPayload, createdAt?: number]
}>()

const form = reactive({
  typeId: props.schemas[0]?.id ?? 'login',
  title: '',
  data: {} as Record<string, string>,
})

const error = ref('')

function selectType(id: string) {
  form.typeId = id
  // Reset data with empty strings for each field key
  const schema = props.schemas.find(s => s.id === id)
  const fresh: Record<string, string> = {}
  for (const f of schema?.fields ?? []) fresh[f.key] = ''
  form.data = fresh
}

const currentSchema = computed(() => props.schemas.find(s => s.id === form.typeId))

function isLastTextarea(field: FieldDef): boolean {
  const fields = currentSchema.value?.fields ?? []
  const last = [...fields].reverse().find(f => f.fieldType === 'textarea')
  return last?.key === field.key
}

function inputType(ft: FieldType): string {
  if (ft === 'url') return 'url'
  if (ft === 'email') return 'email'
  if (ft === 'number') return 'number'
  return 'text'
}

const passwordField = computed(() =>
  currentSchema.value?.fields.find(f => f.fieldType === 'password'),
)
const strength = computed(() => passwordStrength(form.data[passwordField.value?.key ?? ''] ?? ''))

// Card visual helpers
const displayCardNumber = computed(() => {
  const digits = (form.data.number ?? '').replace(/\D/g, '')
  const groups = []
  for (let i = 0; i < 4; i++) {
    const chunk = digits.slice(i * 4, i * 4 + 4)
    groups.push(chunk.padEnd(4, '•'))
  }
  return groups.join('  ')
})

function onCardNumberInput(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16)
  form.data.number = digits.replace(/(.{4})(?=.)/g, '$1 ')
}

function onExpiryInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 4)
  const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  form.data.expiry = formatted
  input.value = formatted
}

onMounted(() => {
  if (props.editData) {
    form.typeId = props.editData.itemType
    form.title = props.editData.title
    form.data = { ...props.editData.payload.data }
  } else {
    // Init empty data for the default selected type
    const schema = props.schemas.find(s => s.id === form.typeId)
    const fresh: Record<string, string> = {}
    for (const f of schema?.fields ?? []) fresh[f.key] = ''
    form.data = fresh
  }
})

function handleSave() {
  error.value = ''
  const payload: ItemPayload = { type: form.typeId, data: { ...form.data } }
  emit('save', props.editData?.id ?? null, form.title, form.typeId, payload, props.editData?.createdAt)
}
</script>

<style scoped>
.item-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.type-tabs {
  display: flex;
  flex: 1;
  gap: 0.4rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.type-tabs::-webkit-scrollbar { display: none; }

.tab {
  flex-shrink: 0;
  padding: 0.45rem 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
  transition: all 0.15s;
}

.tab.active {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

.tab:disabled { opacity: 0.5; cursor: default; }

.btn-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0.3rem;
  line-height: 1;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}
.btn-close:hover { color: var(--color-text); }

form {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-fill { flex: 1; min-height: 0; }

label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

input, textarea {
  width: 100%;
  min-width: 0;
  padding: 0.6rem 0.75rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  resize: vertical;
  font-family: inherit;
}

input:focus, textarea:focus { border-color: var(--color-accent); }

.area-fill { flex: 1; min-height: 100px; resize: none; }
.note-mono { font-family: var(--font-mono); font-size: 0.85rem; }
.input-mono { font-family: var(--font-mono); letter-spacing: 0.05em; }

/* Card preview */
.card-visual {
  border-radius: 14px;
  background: linear-gradient(135deg, #7c74ff 0%, #5247d0 45%, #1a1d3e 100%);
  padding: 1.1rem 1.25rem 1rem;
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

.card-fields { display: flex; flex-direction: column; gap: 0.8rem; }

.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.row-2 > * { min-width: 0; }
.row-2 :deep(.pw-wrap) { min-width: 0; }

.panel-footer {
  flex-shrink: 0;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0.8rem 1rem;
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  padding: 0.6rem 1.5rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-primary:hover { background: var(--color-accent-hover); }

.btn-ghost {
  padding: 0.6rem 1rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.9rem;
  transition: all 0.15s;
}
.btn-ghost:hover { border-color: var(--color-accent); color: var(--color-accent); }

.error { color: var(--color-danger); font-size: 0.82rem; flex-shrink: 0; }

.strength-bar-wrap { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.3rem; }
.strength-track { flex: 1; height: 3px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.strength-bar { height: 100%; border-radius: 2px; transition: width 0.35s ease, background 0.35s ease; }
.strength-label { font-size: 0.7rem; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
</style>
