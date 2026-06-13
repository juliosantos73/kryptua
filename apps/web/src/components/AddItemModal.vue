<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Novo Item</h2>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>

      <form id="modal-form" @submit.prevent="handleSave">
        <div class="field">
          <label>Tipo</label>
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
        </div>

        <div class="field">
          <label for="title">Título</label>
          <input id="title" v-model="form.title" type="text" placeholder="Ex: GitHub" required />
        </div>

        <!-- Login fields -->
        <template v-if="form.itemType === 'login'">
          <div class="field">
            <label>Usuário / Email</label>
            <input v-model="login.username" type="text" autocomplete="off" />
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
          <div class="field">
            <label>Notas</label>
            <textarea v-model="login.notes" rows="3" />
          </div>
        </template>

        <!-- Card fields -->
        <template v-else-if="form.itemType === 'card'">
          <div class="field">
            <label>Número do Cartão</label>
            <input
              v-model="card.number"
              type="text"
              inputmode="numeric"
              autocomplete="cc-number"
              maxlength="19"
              placeholder="0000 0000 0000 0000"
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
            <textarea v-model="card.notes" rows="2" />
          </div>
        </template>

        <!-- Note fields -->
        <template v-else>
          <div class="field">
            <label>Conteúdo</label>
            <textarea v-model="note.content" rows="8" />
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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 480px;
  height: min(90dvh, 640px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

h2 { font-size: 1rem; font-weight: 600; }

.btn-close {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
}

form {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-muted);
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
}

input:focus, textarea:focus {
  border-color: var(--color-accent);
}

.type-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab {
  flex: 1;
  padding: 0.5rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  transition: all 0.15s;
}

.tab.active {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.error {
  color: var(--color-danger);
  font-size: 0.82rem;
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
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

/* Strength bar */
.strength-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.strength-track {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background 0.3s;
}

.strength-label {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
