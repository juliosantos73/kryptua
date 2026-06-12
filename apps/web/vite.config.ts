import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // SQLite-Wasm e kryptua-core precisam de SharedArrayBuffer → COOP/COEP obrigatórios
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    // SQLite-Wasm deve ser carregado como módulo ES nativo, não pré-bundlado
    exclude: ['@sqlite.org/sqlite-wasm'],
  },

  build: {
    target: 'esnext',
  },
})
