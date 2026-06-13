<template>
  <div class="vault-shell">
    <DesktopLayout v-if="!isMobile" @lock="lock" />
    <MobileLayout v-else @lock="lock" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useSyncStore } from '@/stores/sync'
import { useCryptoStore } from '@/stores/crypto'
import { usePlatform } from '@/composables/usePlatform'
import { useVaultSession } from '@/composables/useVaultSession'
import DesktopLayout from '@/layouts/DesktopLayout.vue'
import MobileLayout from '@/layouts/MobileLayout.vue'

const router = useRouter()
const syncStore = useSyncStore()
const cryptoStore = useCryptoStore()
const { isNative } = usePlatform()

const { vault, init, persistNow, cleanup } = useVaultSession()

const isMobile = computed(() => isNative.value || window.innerWidth < 768)

provide('vault', vault)
provide('persistNow', persistNow)

onMounted(async () => {
  const ok = await init()
  if (!ok) router.replace({ name: 'unlock' })
})

onUnmounted(() => {
  cleanup()
  syncStore.destroy()
})

function lock() {
  cleanup()
  syncStore.destroy()
  cryptoStore.lock()
  router.push({ name: 'unlock' })
}
</script>

<style scoped>
.vault-shell {
  height: 100%;
  overflow: hidden;
}
</style>
