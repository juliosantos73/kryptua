<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDbStore } from '@/stores/db'
import { useAppLock } from '@/composables/useAppLock'

const db = useDbStore()
onMounted(() => db.init())
useAppLock()
</script>
