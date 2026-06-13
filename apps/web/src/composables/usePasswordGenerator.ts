const LOWER  = 'abcdefghijklmnopqrstuvwxyz'
const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function randomIndex(max: number): number {
  // rejection sampling — sem viés de módulo
  const limit = 2 ** 32 - (2 ** 32 % max)
  const buf = new Uint32Array(1)
  let val: number
  do { crypto.getRandomValues(buf); val = buf[0] } while (val >= limit)
  return val % max
}

function randomChar(charset: string): string {
  return charset[randomIndex(charset.length)]
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generatePassword(length = 20): string {
  // Garante pelo menos um caracter de cada classe
  const required = [
    randomChar(LOWER),
    randomChar(UPPER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ]
  const rest = Array.from({ length: length - 4 }, () => randomChar(ALL))
  return shuffle([...required, ...rest]).join('')
}

export interface StrengthResult {
  score: number   // 0–7
  label: string
  color: string
  pct: number     // 0–100 para a barra
}

export function passwordStrength(pw: string): StrengthResult {
  if (!pw) return { score: 0, label: '', color: 'transparent', pct: 0 }
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (pw.length >= 16) s++
  if (/[a-z]/.test(pw)) s++
  if (/[A-Z]/.test(pw)) s++
  if (/\d/.test(pw))    s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++

  if (s <= 2) return { score: s, label: 'Muito fraca', color: 'var(--color-danger)', pct: 14 * s + 7 }
  if (s <= 4) return { score: s, label: 'Média',       color: '#f6ad55', pct: 14 * s + 7 }
  if (s <= 5) return { score: s, label: 'Boa',         color: '#68d391', pct: 14 * s + 7 }
  return               { score: s, label: 'Forte',       color: 'var(--color-success)', pct: 100 }
}
