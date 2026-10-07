export const SECRET_TTL_DAYS = 5
export const SECRET_TTL_MS = SECRET_TTL_DAYS * 24 * 60 * 60 * 1000
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const MAX_NOTE_LENGTH = 100_000
export const MAX_SEALED_BYTES = 512 * 1024
export const MAX_BODY_BYTES = 1024 * 1024

export const PIN_LENGTH = 4
export const PIN_PATTERN = /^\d{4}$/
export const MAX_PIN_ATTEMPTS = 5

export const SECRET_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/
export const MASTER_KEY_PATTERN = /^[A-Za-z0-9_-]{16}$/
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export type SecretContent = { type: 'note'; text: string }

export type SecretInfo =
   | { state: 'active'; pin: boolean; expiresAt: number; attemptsLeft: number }
   | { state: 'expired' | 'deleted' }
