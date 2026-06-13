import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const RELAY_URL = (import.meta.env['VITE_RELAY_URL'] as string | undefined) ?? 'ws://localhost:8080/sync'

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ItemMeta {
  title: string
  itemType: 'login' | 'card' | 'secure_note'
  createdAt: number
  updatedAt: number
}

export const useSyncStore = defineStore('sync', () => {
  const status = ref<SyncStatus>('disconnected')
  // shallowRef: o Vue não precisa tornar o Y.Doc internamente reativo
  const ydoc = shallowRef<Y.Doc | null>(null)
  const itemMeta = shallowRef<Y.Map<ItemMeta> | null>(null)
  const itemBlobs = shallowRef<Y.Map<Uint8Array> | null>(null)

  // Versão incremental usada para forçar reatividade em computed que dependem do Yjs
  const version = ref(0)

  let provider: WebsocketProvider | null = null

  function init(vaultId: string, savedState?: Uint8Array): void {
    if (ydoc.value) destroy()

    const doc = new Y.Doc()
    ydoc.value = doc
    itemMeta.value = doc.getMap<ItemMeta>('meta')
    itemBlobs.value = doc.getMap<Uint8Array>('blobs')

    // Restaura estado local persistido
    if (savedState?.length) {
      try {
        Y.applyUpdate(doc, savedState)
      } catch {
        // Estado corrompido — ignorar e aguardar sync do relay
      }
    }

    // Incrementa versão a cada mudança para triggers reactivos no Vue
    doc.on('update', () => { version.value++ })

    // Conecta ao relay server
    status.value = 'connecting'
    provider = new WebsocketProvider(RELAY_URL, vaultId, doc, { connect: true })

    provider.on('status', ({ status: s }: { status: string }) => {
      status.value = s === 'connected' ? 'connected'
        : s === 'connecting' ? 'connecting'
        : 'disconnected'
    })
  }

  function destroy(): void {
    provider?.destroy()
    provider = null
    ydoc.value?.destroy()
    ydoc.value = null
    itemMeta.value = null
    itemBlobs.value = null
    status.value = 'disconnected'
  }

  function getDocState(): Uint8Array | null {
    if (!ydoc.value) return null
    return Y.encodeStateAsUpdate(ydoc.value)
  }

  function addItem(
    id: string,
    meta: ItemMeta,
    blob: Uint8Array,
  ): void {
    if (!ydoc.value || !itemMeta.value || !itemBlobs.value) {
      throw new Error('Sync não inicializado')
    }
    ydoc.value.transact(() => {
      itemMeta.value!.set(id, meta)
      itemBlobs.value!.set(id, blob)
    })
  }

  function updateItem(
    id: string,
    meta: ItemMeta,
    blob: Uint8Array,
  ): void {
    if (!ydoc.value || !itemMeta.value || !itemBlobs.value) {
      throw new Error('Sync não inicializado')
    }
    ydoc.value.transact(() => {
      itemMeta.value!.set(id, meta)
      itemBlobs.value!.set(id, blob)
    })
  }

  function deleteItem(id: string): void {
    if (!ydoc.value) throw new Error('Sync não inicializado')
    ydoc.value.transact(() => {
      itemMeta.value?.delete(id)
      itemBlobs.value?.delete(id)
    })
  }

  function getItems(): Array<{ id: string } & ItemMeta & { blob: Uint8Array }> {
    if (!itemMeta.value || !itemBlobs.value) return []
    const result: Array<{ id: string } & ItemMeta & { blob: Uint8Array }> = []
    for (const [id, meta] of itemMeta.value.entries()) {
      const blob = itemBlobs.value.get(id)
      if (blob) result.push({ id, ...meta, blob })
    }
    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  return {
    status,
    version,
    ydoc,
    itemMeta,
    itemBlobs,
    init,
    destroy,
    getDocState,
    addItem,
    updateItem,
    deleteItem,
    getItems,
  }
})
