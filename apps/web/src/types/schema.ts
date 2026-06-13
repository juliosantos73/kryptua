export type FieldType =
  | 'text'
  | 'password'
  | 'pin'
  | 'url'
  | 'email'
  | 'number'
  | 'textarea'
  | 'card-number'
  | 'expiry'

export interface FieldDef {
  key: string
  label: string
  fieldType: FieldType
  required?: boolean
  placeholder?: string
  copyable?: boolean
  masked?: boolean
}

export interface TypeSchema {
  id: string
  name: string
  icon: string
  isDefault: boolean
  order: number
  fields: FieldDef[]
}

export const DEFAULT_SCHEMAS: TypeSchema[] = [
  {
    id: 'login',
    name: 'Login',
    icon: '🔑',
    isDefault: true,
    order: 0,
    fields: [
      { key: 'username', label: 'Usuário / Email', fieldType: 'text', placeholder: 'usuario@exemplo.com', copyable: true },
      { key: 'password', label: 'Senha', fieldType: 'password', copyable: true, masked: true },
      { key: 'url', label: 'URL', fieldType: 'url', placeholder: 'https://' },
      { key: 'notes', label: 'Notas', fieldType: 'textarea', placeholder: 'Observações opcionais...' },
    ],
  },
  {
    id: 'card',
    name: 'Cartão',
    icon: '💳',
    isDefault: true,
    order: 1,
    fields: [
      { key: 'number', label: 'Número', fieldType: 'card-number', placeholder: '0000 0000 0000 0000', copyable: true, masked: true },
      { key: 'holder', label: 'Titular', fieldType: 'text', placeholder: 'Nome como no cartão' },
      { key: 'expiry', label: 'Validade', fieldType: 'expiry', placeholder: 'MM/AA' },
      { key: 'cvv', label: 'CVV', fieldType: 'pin', placeholder: '•••', copyable: true, masked: true },
      { key: 'pin', label: 'PIN', fieldType: 'pin', placeholder: 'PIN do cartão', masked: true },
      { key: 'notes', label: 'Notas', fieldType: 'textarea', placeholder: 'Observações opcionais...' },
    ],
  },
  {
    id: 'secure_note',
    name: 'Nota',
    icon: '📝',
    isDefault: true,
    order: 2,
    fields: [
      { key: 'content', label: 'Conteúdo', fieldType: 'textarea', placeholder: 'Conteúdo da nota segura...' },
    ],
  },
]
