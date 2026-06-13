<template>
  <div class="editor">
    <div class="editor-header">
      <input v-model="draft.icon" class="icon-input" maxlength="2" placeholder="📁" title="Ícone (emoji)" />
      <input v-model="draft.name" class="name-input" placeholder="Nome do tipo" required />
    </div>

    <div class="fields-section">
      <div class="fields-label">Campos</div>
      <div v-for="(field, idx) in draft.fields" :key="idx" class="field-row">
        <input v-model="field.label" class="field-label-input" placeholder="Etiqueta" />
        <select v-model="field.fieldType" class="field-type-select">
          <option value="text">Texto</option>
          <option value="password">Senha</option>
          <option value="pin">PIN / Código</option>
          <option value="url">URL</option>
          <option value="email">Email</option>
          <option value="number">Número</option>
          <option value="textarea">Nota longa</option>
        </select>
        <label class="field-check" title="Ocultar valor por defeito">
          <input v-model="field.masked" type="checkbox" />
          <span>Ocultar</span>
        </label>
        <label class="field-check" title="Mostrar botão de copiar">
          <input v-model="field.copyable" type="checkbox" />
          <span>Copiar</span>
        </label>
        <button class="btn-remove-field" title="Remover campo" @click="removeField(idx)">✕</button>
      </div>
      <button class="btn-add-field" @click="addField">+ Campo</button>
    </div>

    <div class="editor-footer">
      <button class="btn-ghost-sm" @click="$emit('cancel')">Cancelar</button>
      <button class="btn-save-sm" :disabled="!draft.name.trim()" @click="save">Guardar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { TypeSchema, FieldDef, FieldType } from '@/types/schema'

const props = defineProps<{ initial?: TypeSchema }>()

const emit = defineEmits<{
  save: [schema: TypeSchema]
  cancel: []
}>()

const draft = reactive<TypeSchema>({
  id: props.initial?.id ?? '',
  name: props.initial?.name ?? '',
  icon: props.initial?.icon ?? '',
  isDefault: props.initial?.isDefault ?? false,
  order: props.initial?.order ?? 0,
  fields: props.initial?.fields.map(f => ({ ...f })) ?? [],
})

function addField() {
  draft.fields.push({
    key: '',
    label: '',
    fieldType: 'text' as FieldType,
    copyable: false,
    masked: false,
  })
}

function removeField(idx: number) {
  draft.fields.splice(idx, 1)
}

function labelToKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `field_${Date.now()}`
}

function save() {
  // Auto-generate key from label for fields without a key
  for (const f of draft.fields) {
    if (!f.key) f.key = labelToKey(f.label)
  }
  // Remove empty-label fields
  draft.fields = draft.fields.filter(f => f.label.trim())
  emit('save', { ...draft, fields: draft.fields.map(f => ({ ...f })) })
}
</script>

<style scoped>
.editor {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  margin: 0.35rem 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-header { display: flex; gap: 0.5rem; align-items: center; }

.icon-input {
  width: 2.4rem;
  text-align: center;
  font-size: 1.1rem;
  padding: 0.35rem 0.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  outline: none;
}
.icon-input:focus { border-color: var(--color-accent); }

.name-input {
  flex: 1;
  padding: 0.4rem 0.65rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
}
.name-input:focus { border-color: var(--color-accent); }

.fields-section { display: flex; flex-direction: column; gap: 0.4rem; }

.fields-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.07em; color: var(--color-text-muted); }

.field-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.field-label-input {
  flex: 1;
  min-width: 80px;
  padding: 0.3rem 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.8rem;
  outline: none;
}
.field-label-input:focus { border-color: var(--color-accent); }

.field-type-select {
  padding: 0.3rem 0.4rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.78rem;
  outline: none;
}

.field-check {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.btn-remove-field {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  padding: 0.2rem 0.3rem;
  flex-shrink: 0;
  transition: color 0.1s;
}
.btn-remove-field:hover { color: var(--color-danger); }

.btn-add-field {
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  color: var(--color-accent);
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  align-self: flex-start;
  transition: border-color 0.15s;
}
.btn-add-field:hover { border-color: var(--color-accent); }

.editor-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-border);
}

.btn-save-sm {
  padding: 0.4rem 1rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-save-sm:hover:not(:disabled) { background: var(--color-accent-hover); }
.btn-save-sm:disabled { opacity: 0.5; cursor: default; }

.btn-ghost-sm {
  padding: 0.4rem 0.85rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  transition: all 0.15s;
}
.btn-ghost-sm:hover { border-color: var(--color-text-muted); color: var(--color-text); }
</style>
