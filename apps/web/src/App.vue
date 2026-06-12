<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDbStore } from '@/stores/db'

const db = useDbStore()
onMounted(() => db.init())
</script>
