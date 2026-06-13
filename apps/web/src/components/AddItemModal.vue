<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">

      <!-- Header with type switcher -->
      <div class="modal-header">
        <div class="type-tabs">
          <button
            v-for="t in types"
            :key="t.value"
            type="button"
            :class="['tab', { active: form.itemType === t.value }]"
            @click="form.itemType = t.value"
          >
            {{ t.icon }} {{ t.label }}
          </button>
        </div>
        <button class="btn-close" type="button" @click="$emit('close')">✕</button>
      </div>

      <form id="modal-form" @submit.prevent="handleSave">

        <!-- ── LOGIN ─────────────────────────────────── -->
        <template v-if="form.itemType === 'login'">
          <div class="field">
            <label for="title">Título</label>
            <input id="title" v-model="form.title" type="text" placeholder="Ex: GitHub" required />
          </div>
          <div class="field">
            <label>Usuário / Email</label>
            <input v-model="login.username" type="text" autocomplete="off" placeholder="usuario@exemplo.com" />
          </div>
          <div class="field">
            <label>Senha</label>
            <PasswordInput
              v-model="login.password"
              :generateable="true"
              autocomplete="new-password"
              @generate="login.password = generatePassword()"
            />
            <div v-if="login.password" class="strength-bar-wrap">
              <div class="strength-track">
                <div class="strength-bar" :style="{ width: loginStrength.pct + '%', background: loginStrength.color }" />
              </div>
              <span class="strength-label" :style="{ color: loginStrength.color }">{{ loginStrength.label }}</span>
            </div>
          </div>
          <div class="field">
            <label>URL</label>
            <input v-model="login.url" type="url" placeholder="https://" />
          </div>
          <div class="field field-fill">
            <label>Notas</label>
            <textarea v-model="login.notes" class="area-fill" placeholder="Observações opcionais..." />
          </div>
        </template>

        <!-- ── CARTÃO ─────────────────────────────────── -->
        <template v-else-if="form.itemType === 'card'">
          <!-- Card visual preview -->
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
            <div class="card-number-display">{{ displayNumber }}</div>
            <div class="card-bottom">
              <div class="card-info">
                <span class="card-info-label">TITULAR</span>
                <span class="card-info-value">{{ card.holder.toUpperCase() || 'NOME DO TITULAR' }}</span>
              </div>
              <div class="card-info card-info-right">
                <span class="card-info-label">VALIDADE</span>
                <span class="card-info-value">{{ card.expiry || 'MM/AA' }}</span>
              </div>
            </div>
          </div>

          <!-- Card fields -->
          <div class="card-fields">
            <div class="field">
              <label for="title">Nome / Apelido do Cartão</label>
              <input id="title" v-model="form.title" type="text" placeholder="Ex: Nubank, Multibanco..." required />
            </div>
            <div class="field">
              <label>Número</label>
              <input
                :value="card.number"
                type="text"
                inputmode="numeric"
                autocomplete="cc-number"
                maxlength="19"
                placeholder="0000 0000 0000 0000"
                class="input-mono"
                @input="onCardNumberInput"
              />
            </div>
            <div class="field">
              <label>Titular</label>
              <input v-model="card.holder" type="text" autocomplete="cc-name" placeholder="Nome como no cartão" />
            </div>
            <div class="row-2">
              <div class="field">
                <label>Validade</label>
                <input v-model="card.expiry" type="text" placeholder="MM/AA" maxlength="5" autocomplete="cc-exp" />
              </div>
              <div class="field">
                <label>CVV</label>
                <PasswordInput v-model="card.cvv" placeholder="•••" autocomplete="cc-csc" />
              </div>
            </div>
            <div class="field">
              <label>PIN</label>
              <PasswordInput v-model="card.pin" placeholder="PIN do cartão" autocomplete="off" />
            </div>
            <div class="field">
              <label>Notas</label>
              <textarea v-model="card.notes" rows="2" placeholder="Observações opcionais..." />
            </div>
          </div>
        </template>

        <!-- ── NOTA ─────────────────────────────────── -->
        <template v-else>
          <div class="field">
            <label for="title">Título</label>
            <input id="title" v-model="form.title" type="text" placeholder="Ex: Chaves SSH..." required />
          </div>
          <div class="field field-fill">
            <label>Conteúdo</label>
            <textarea v-model="note.content" class="area-fill note-mono" placeholder="Conteúdo da nota segura..." />
          </div>
        </template>

        <p v-if="error" class="error">{{ error }}</p>
      </form>

      <div class="modal-footer">
        <button type="button" class="btn-ghost" @click="$emit('close')">Cancelar</button>
        <button type="submit" form="modal-form" class="btn-primary">Salvar</button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { ItemPayload, ItemType } from '@/types/vault'
import PasswordInput from './PasswordInput.vue'
import { generatePassword, passwordStrength } from '@/composables/usePasswordGenerator'

const loginStrength = computed(() => passwordStrength(login.password))

const emit = defineEmits<{
  close: []
  save: [title: string, type: ItemType, payload: ItemPayload]
}>()

const types = [
  { value: 'login' as ItemType, label: 'Login', icon: '🔑' },
  { value: 'card' as ItemType, label: 'Cartão', icon: '💳' },
  { value: 'secure_note' as ItemType, label: 'Nota', icon: '📝' },
]

const form = reactive({ itemType: 'login' as ItemType, title: '' })
const login = reactive({ username: '', password: '', url: '', notes: '' })
const card = reactive({ number: '', holder: '', expiry: '', cvv: '', pin: '', notes: '' })
const note = reactive({ content: '' })
const error = ref('')

const displayNumber = computed(() => {
  const digits = card.number.replace(/\D/g, '')
  const groups = []
  for (let i = 0; i < 4; i++) {
    const chunk = digits.slice(i * 4, i * 4 + 4)
    groups.push(chunk.padEnd(4, '•'))
  }
  return groups.join('  ')
})

function onCardNumberInput(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16)
  card.number = digits.replace(/(.{4})(?=.)/g, '$1 ')
}

function handleSave() {
  error.value = ''
  let payload: ItemPayload

  if (form.itemType === 'login') {
    payload = { type: 'login', data: { ...login } }
  } else if (form.itemType === 'card') {
    payload = { type: 'card', data: { ...card } }
  } else {
    payload = { type: 'secure_note', data: { content: note.content } }
  }

  emit('save', form.title, form.itemType, payload)
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 460px;
  height: min(92dvh, 680px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────── */
.modal-header {
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
}

.tab {
  flex: 1;
  padding: 0.45rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  transition: all 0.15s;
}

.tab.active {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

.btn-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  padding: 0.3rem 0.5rem;
  line-height: 1;
}

/* ── Form ────────────────────────────── */
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

.field-fill {
  flex: 1;
  min-height: 0;
}

label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

input, textarea {
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

.area-fill {
  flex: 1;
  min-height: 100px;
  resize: none;
}

.note-mono { font-family: var(--font-mono); font-size: 0.85rem; }
.input-mono { font-family: var(--font-mono); letter-spacing: 0.05em; }

/* ── Card preview ────────────────────── */
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
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  top: -80px;
  right: -50px;
  pointer-events: none;
}

.card-visual::after {
  content: '';
  position: absolute;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  bottom: -50px;
  left: 20px;
  pointer-events: none;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.chip {
  width: 38px;
  height: 28px;
  flex-shrink: 0;
}

.contactless {
  width: 24px;
  height: 24px;
  opacity: 0.7;
}

.card-number-display {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin: 0.1rem 0;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.card-info-right { text-align: right; }

.card-info-label {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
}

.card-info-value {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

/* ── Card fields ─────────────────────── */
.card-fields {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* ── Footer ──────────────────────────── */
.modal-footer {
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

.error {
  color: var(--color-danger);
  font-size: 0.82rem;
  flex-shrink: 0;
}

/* ── Strength bar ────────────────────── */
.strength-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

.strength-track {
  flex: 1;
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.35s ease, background 0.35s ease;
}

.strength-label {
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
