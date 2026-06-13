export type ItemType = 'login' | 'card' | 'secure_note'

export interface VaultMeta {
  id: string
  name: string
  salt: Uint8Array
  verifyBlob?: Uint8Array  // AES-GCM cipher of a known string — wrong key fails decryption
  createdAt: number
  updatedAt: number
}

export interface ItemRow {
  id: string
  vaultId: string
  itemType: ItemType
  title: string
  encryptedPayload: Uint8Array
  createdAt: number
  updatedAt: number
}

export interface LoginPayload {
  type: 'login'
  data: { username: string; password: string; url: string; notes: string }
}

export interface CardPayload {
  type: 'card'
  data: { number: string; holder: string; expiry: string; cvv: string; pin: string; notes: string }
}

export interface NotePayload {
  type: 'secure_note'
  data: { content: string }
}

export type ItemPayload = LoginPayload | CardPayload | NotePayload
