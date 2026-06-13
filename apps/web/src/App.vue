<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDbStore } from '@/stores/db'
import { useThemeStore } from '@/stores/theme'
import { useAppLock } from '@/composables/useAppLock'

const db = useDbStore()
const theme = useThemeStore()
onMounted(() => { db.init(); theme.init() })
useAppLock()
</script>
