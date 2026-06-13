<template>
  <div class="pw-wrap" :class="{ focused }">
    <input
      ref="inputEl"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :value="props.modelValue"
      class="pw-input"
      @focus="focused = true"
      @blur="focused = false"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="props.generateable"
      type="button"
      class="pw-eye pw-gen"
      title="Gerar senha forte"
      @click="emit('generate')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>
    <button
      type="button"
      class="pw-eye"
      :title="visible ? 'Ocultar' : 'Mostrar password'"
      @click="visible = !visible"
    >
      <!-- olho aberto -->
      <svg v-if="!visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <!-- olho fechado -->
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ modelValue?: string; generateable?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; generate: [] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const visible = ref(false)
const focused = ref(false)

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<style scoped>
.pw-wrap {
  display: flex;
  align-items: center;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  transition: border-color 0.15s;
  overflow: hidden;
}

.pw-wrap.focused {
  border-color: var(--color-accent);
}

.pw-input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  min-width: 0;
}

.pw-eye {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 100%;
  min-height: 2.4rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  transition: color 0.15s;
  padding: 0;
}

.pw-eye:hover { color: var(--color-accent); }

.pw-gen {
  border-right: 1px solid var(--color-border);
}

.pw-eye svg {
  width: 16px;
  height: 16px;
}
</style>
