<template>
  <div class="manager">

    <!-- Schema list -->
    <ul class="schema-list">
      <li v-for="(schema, idx) in schemas" :key="schema.id" class="schema-item">
        <div class="schema-row">
          <div class="move-btns">
            <button :disabled="idx === 0" class="btn-move" title="Mover acima" @click="moveSchema(schema.id, 'up')">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button :disabled="idx === schemas.length - 1" class="btn-move" title="Mover abaixo" @click="moveSchema(schema.id, 'down')">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <span class="schema-icon">{{ schema.icon }}</span>
          <span class="schema-name">{{ schema.name }}</span>
          <span v-if="schema.isDefault" class="badge-default">padrão</span>
          <span class="schema-count">{{ itemCount(schema.id) }}</span>
          <button class="btn-edit-schema" @click="startEdit(schema)">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            v-if="!schema.isDefault"
            class="btn-del-schema"
            :title="`Apagar ${schema.name}`"
            @click="confirmDel = confirmDel === schema.id ? null : schema.id"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>

        <!-- Inline delete confirm -->
        <div v-if="confirmDel === schema.id" class="del-confirm">
          <span>Apagar "{{ schema.name }}"? Os itens deste tipo ficam sem esquema de exibição.</span>
          <button class="btn-yes" @click="doDelete(schema.id)">Apagar</button>
          <button class="btn-no" @click="confirmDel = null">Cancelar</button>
        </div>

        <!-- Inline editor -->
        <SchemaEditor
          v-if="editingId === schema.id"
          :initial="schema"
          @save="onEditorSave"
          @cancel="editingId = null"
        />
      </li>
    </ul>

    <!-- Create new -->
    <div class="create-area">
      <button v-if="!showCreate" class="btn-create" @click="showCreate = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Criar tipo
      </button>
      <SchemaEditor
        v-else
        @save="onCreateSave"
        @cancel="showCreate = false"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TypeSchema } from '@/types/schema'
import { useTypeSchemas } from '@/composables/useTypeSchemas'
import SchemaEditor from './SchemaEditor.vue'

const props = defineProps<{ itemCounts: Record<string, number> }>()

const { schemas, createSchema, updateSchema, deleteSchema, moveSchema } = useTypeSchemas()

const editingId = ref<string | null>(null)
const showCreate = ref(false)
const confirmDel = ref<string | null>(null)

function itemCount(id: string): number {
  return props.itemCounts[id] ?? 0
}

function startEdit(schema: TypeSchema) {
  editingId.value = editingId.value === schema.id ? null : schema.id
  showCreate.value = false
}

function onEditorSave(draft: TypeSchema) {
  updateSchema(draft)
  editingId.value = null
}

function onCreateSave(draft: TypeSchema) {
  createSchema(draft.name, draft.icon, draft.fields)
  showCreate.value = false
}

function doDelete(id: string) {
  deleteSchema(id)
  confirmDel.value = null
}
</script>

<style scoped>
.manager { display: flex; flex-direction: column; gap: 0; }

.schema-list { list-style: none; }

.schema-item {
  border-bottom: 1px solid var(--color-border);
}

.schema-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0;
}

.move-btns { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }

.btn-move {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0.1rem 0.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  transition: color 0.1s;
}
.btn-move:hover:not(:disabled) { color: var(--color-text); }
.btn-move:disabled { opacity: 0.25; cursor: default; }

.schema-icon { font-size: 1.1rem; flex-shrink: 0; }
.schema-name { flex: 1; font-size: 0.875rem; font-weight: 500; }

.badge-default {
  font-size: 0.62rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.schema-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  min-width: 1.5rem;
  text-align: right;
  flex-shrink: 0;
}

.btn-edit-schema, .btn-del-schema {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0.3rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.1s;
}
.btn-edit-schema:hover { color: var(--color-accent); }
.btn-del-schema:hover { color: var(--color-danger); }

.del-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0 0.75rem 1.5rem;
  font-size: 0.8rem;
  color: var(--color-danger);
}

.btn-yes {
  padding: 0.25rem 0.65rem;
  background: var(--color-danger);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 0.78rem;
  font-weight: 600;
}

.btn-no {
  padding: 0.25rem 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.create-area {
  padding: 0.75rem 0 0.25rem;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  color: var(--color-accent);
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 500;
  width: 100%;
  transition: border-color 0.15s, background 0.15s;
}
.btn-create:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
</style>
