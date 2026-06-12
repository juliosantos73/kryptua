import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ItemRow, VaultMeta } from '@/types/vault'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqliteDb = any

export const useDbStore = defineStore('db', () => {
  const isReady = ref(false)
  const error = ref<string | null>(null)
  let db: SqliteDb = null

  async function init(): Promise<void> {
    if (isReady.value) return
    try {
      const { default: sqlite3InitModule } = await import('@sqlite.org/sqlite-wasm')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sqlite3: any = await sqlite3InitModule({ print: () => {}, printErr: console.error })

      // Prefere OPFS (persistência real entre sessões) com fallback em memória
      if (sqlite3.oo1.OpfsDb) {
        db = new sqlite3.oo1.OpfsDb('/kryptua.db')
      } else {
        console.warn('OPFS indisponível — dados não serão persistidos entre sessões')
        db = new sqlite3.oo1.DB('/kryptua.db', 'ct')
      }

      migrate()
      isReady.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao inicializar banco'
      throw e
    }
  }

  function migrate(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS vault_meta (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        salt        BLOB NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id                TEXT PRIMARY KEY,
        vault_id          TEXT NOT NULL,
        item_type         TEXT NOT NULL
                            CHECK (item_type IN ('login', 'card', 'secure_note')),
        title             TEXT NOT NULL,
        encrypted_payload BLOB NOT NULL,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        FOREIGN KEY (vault_id) REFERENCES vault_meta(id)
      );

      CREATE INDEX IF NOT EXISTS idx_items_vault ON items(vault_id);
      CREATE INDEX IF NOT EXISTS idx_items_type  ON items(item_type);
    `)
  }

  // --- Vault ---

  function saveVault(vault: VaultMeta): void {
    db.exec(
      `INSERT OR REPLACE INTO vault_meta (id, name, salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      { bind: [vault.id, vault.name, vault.salt, vault.createdAt, vault.updatedAt] },
    )
  }

  function loadVault(): VaultMeta | null {
    const rows: Record<string, unknown>[] = db.exec(
      'SELECT id, name, salt, created_at, updated_at FROM vault_meta LIMIT 1',
      { rowMode: 'object', returnValue: 'resultRows' },
    )
    if (!rows.length) return null
    const r = rows[0]
    return {
      id: r['id'] as string,
      name: r['name'] as string,
      salt: r['salt'] as Uint8Array,
      createdAt: r['created_at'] as number,
      updatedAt: r['updated_at'] as number,
    }
  }

  function hasVault(): boolean {
    return loadVault() !== null
  }

  // --- Items ---

  function saveItem(item: ItemRow): void {
    db.exec(
      `INSERT OR REPLACE INTO items
         (id, vault_id, item_type, title, encrypted_payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        bind: [
          item.id,
          item.vaultId,
          item.itemType,
          item.title,
          item.encryptedPayload,
          item.createdAt,
          item.updatedAt,
        ],
      },
    )
  }

  function listItems(vaultId: string): ItemRow[] {
    const rows: Record<string, unknown>[] = db.exec(
      `SELECT id, vault_id, item_type, title, encrypted_payload, created_at, updated_at
       FROM items WHERE vault_id = ? ORDER BY updated_at DESC`,
      { bind: [vaultId], rowMode: 'object', returnValue: 'resultRows' },
    )
    return rows.map((r) => ({
      id: r['id'] as string,
      vaultId: r['vault_id'] as string,
      itemType: r['item_type'] as ItemRow['itemType'],
      title: r['title'] as string,
      encryptedPayload: r['encrypted_payload'] as Uint8Array,
      createdAt: r['created_at'] as number,
      updatedAt: r['updated_at'] as number,
    }))
  }

  function deleteItem(id: string): void {
    db.exec('DELETE FROM items WHERE id = ?', { bind: [id] })
  }

  return {
    isReady,
    error,
    init,
    saveVault,
    loadVault,
    hasVault,
    saveItem,
    listItems,
    deleteItem,
  }
})
