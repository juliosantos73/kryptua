export interface VaultMeta {
  id: string
  name: string
  salt: Uint8Array
  verifyBlob?: Uint8Array
  createdAt: number
  updatedAt: number
}

export interface ItemRow {
  id: string
  vaultId: string
  itemType: string
  title: string
  isFavorite: boolean
  encryptedPayload: Uint8Array
  createdAt: number
  updatedAt: number
}

export interface ItemPayload {
  type: string
  data: Record<string, string>
}
