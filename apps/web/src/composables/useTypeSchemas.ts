import { computed } from 'vue'
import { useSyncStore } from '@/stores/sync'
import type { TypeSchema, FieldDef } from '@/types/schema'

export function useTypeSchemas() {
  const syncStore = useSyncStore()

  const schemas = computed(() => {
    void syncStore.version
    return syncStore.getSchemas()
  })

  function schemaById(id: string): TypeSchema | undefined {
    return schemas.value.find(s => s.id === id)
  }

  function createSchema(name: string, icon: string, fields: FieldDef[]): void {
    const maxOrder = schemas.value.reduce((m, s) => Math.max(m, s.order), -1)
    syncStore.saveSchema({
      id: crypto.randomUUID(),
      name,
      icon: icon || '📁',
      isDefault: false,
      order: maxOrder + 1,
      fields,
    })
  }

  function updateSchema(schema: TypeSchema): void {
    syncStore.saveSchema(schema)
  }

  function deleteSchema(id: string): void {
    const s = schemaById(id)
    if (!s || s.isDefault) return
    syncStore.deleteSchema(id)
  }

  function moveSchema(id: string, direction: 'up' | 'down'): void {
    const list = [...schemas.value]
    const idx = list.findIndex(s => s.id === id)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= list.length) return
    const a = list[idx]
    const b = list[targetIdx]
    syncStore.saveSchema({ ...a, order: b.order })
    syncStore.saveSchema({ ...b, order: a.order })
  }

  return { schemas, schemaById, createSchema, updateSchema, deleteSchema, moveSchema }
}
