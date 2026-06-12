import { createRouter, createWebHashHistory } from 'vue-router'
import { useCryptoStore } from '@/stores/crypto'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/unlock',
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
    },
    {
      path: '/unlock',
      name: 'unlock',
      component: () => import('@/views/UnlockView.vue'),
    },
    {
      path: '/vault',
      name: 'vault',
      component: () => import('@/views/VaultView.vue'),
      meta: { requiresUnlock: true },
    },
  ],
})

router.beforeEach((to) => {
  const crypto = useCryptoStore()
  if (to.meta.requiresUnlock && !crypto.isUnlocked) {
    return { name: 'unlock' }
  }
})

export default router
