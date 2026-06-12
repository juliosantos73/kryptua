<template>
  <div class="field">
    <div class="field-header">
      <span class="field-label">{{ label }}</span>
      <button v-if="copyable" class="btn-copy" @click="copy">
        {{ copied ? '✓ Copiado' : 'Copiar' }}
      </button>
    </div>

    <div v-if="multiline" class="field-value multiline">{{ value }}</div>
    <div v-else class="field-value">
      <span v-if="secret && hidden" class="secret-mask">••••••••••••</span>
      <span v-else class="mono">{{ value || '—' }}</span>
      <button v-if="secret" class="btn-reveal" @click="hidden = !hidden">
        {{ hidden ? 'Mostrar' : 'Ocultar' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  value: string
  copyable?: boolean
  secret?: boolean
  multiline?: boolean
}>()

const hidden = ref(true)
const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(props.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.btn-copy, .btn-reveal {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
  transition: border-color 0.15s, color 0.15s;
}

.btn-copy:hover, .btn-reveal:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.field-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  min-height: 2.4rem;
}

.field-value.multiline {
  white-space: pre-wrap;
  align-items: flex-start;
  min-height: 6rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.mono {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  flex: 1;
  word-break: break-all;
}

.secret-mask {
  flex: 1;
  color: var(--color-text-muted);
  letter-spacing: 2px;
}
</style>
