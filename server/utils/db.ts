import { createHash, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

type SecretRow = {
   id: string
   payload: Uint8Array | null
   read_hash: string | null
   delete_hash: string | null
   has_pin: number
   failed_attempts: number
   state: 'active' | 'expired' | 'deleted'
   expires_at: number
}

let database: DatabaseSync | undefined

function db(): DatabaseSync {
   if (database) return database
   const path = resolve(useRuntimeConfig().dbPath)
   mkdirSync(dirname(path), { recursive: true })
   database = new DatabaseSync(path)
   database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA secure_delete = ON;
      CREATE TABLE IF NOT EXISTS secrets (
         id TEXT PRIMARY KEY,
         payload BLOB,
         read_hash TEXT,
         delete_hash TEXT,
         has_pin INTEGER NOT NULL DEFAULT 0,
         failed_attempts INTEGER NOT NULL DEFAULT 0,
         state TEXT NOT NULL DEFAULT 'active',
         expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS secrets_expires_at ON secrets (expires_at);
   `)
   return database
}

export function hashToken(token: string): string {
   return createHash('sha256').update(token).digest('base64url')
}

function matchesHash(token: string, hash: string | null): boolean {
   if (!hash) return false
   return timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(hash))
}

export function insertSecret(input: {
   id: string
   payload: Uint8Array
   readToken: string
   deleteToken: string
   hasPin: boolean
}): boolean {
   const result = db()
      .prepare(
         'INSERT OR IGNORE INTO secrets (id, payload, read_hash, delete_hash, has_pin, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
         input.id,
         input.payload,
         hashToken(input.readToken),
         hashToken(input.deleteToken),
         input.hasPin ? 1 : 0,
         Date.now() + SECRET_TTL_MS
      )
   return result.changes === 1
}

function findSecret(id: string): SecretRow | undefined {
   const row = db().prepare('SELECT * FROM secrets WHERE id = ?').get(id) as SecretRow | undefined
   if (row?.state === 'active' && row.expires_at <= Date.now()) {
      wipeSecret(id, 'expired')
      return { ...row, state: 'expired', payload: null }
   }
   return row
}

function wipeSecret(id: string, state: 'expired' | 'deleted') {
   db()
      .prepare(
         'UPDATE secrets SET payload = NULL, read_hash = NULL, delete_hash = NULL, state = ?, expires_at = ? WHERE id = ?'
      )
      .run(state, Date.now() + TOMBSTONE_TTL_MS, id)
}

export function secretInfo(id: string): SecretInfo | undefined {
   const row = findSecret(id)
   if (!row) return undefined
   if (row.state !== 'active') return { state: row.state }
   return {
      state: 'active',
      pin: row.has_pin === 1,
      expiresAt: row.expires_at,
      attemptsLeft: MAX_PIN_ATTEMPTS - row.failed_attempts,
   }
}

export type ReadResult =
   | { status: 'ok'; payload: Uint8Array; expiresAt: number }
   | { status: 'missing' }
   | { status: 'gone'; state: 'expired' | 'deleted' }
   | { status: 'denied'; attemptsLeft: number }

export function readSecret(id: string, readToken: string): ReadResult {
   const row = findSecret(id)
   if (!row) return { status: 'missing' }
   if (row.state !== 'active' || !row.payload)
      return { status: 'gone', state: row.state === 'active' ? 'deleted' : row.state }
   if (matchesHash(readToken, row.read_hash)) {
      return { status: 'ok', payload: row.payload, expiresAt: row.expires_at }
   }
   if (!row.has_pin) return { status: 'denied', attemptsLeft: MAX_PIN_ATTEMPTS }
   const failed = row.failed_attempts + 1
   if (failed >= MAX_PIN_ATTEMPTS) {
      wipeSecret(id, 'deleted')
      return { status: 'gone', state: 'deleted' }
   }
   db().prepare('UPDATE secrets SET failed_attempts = ? WHERE id = ?').run(failed, id)
   return { status: 'denied', attemptsLeft: MAX_PIN_ATTEMPTS - failed }
}

export function deleteSecret(id: string, deleteToken: string): boolean {
   const row = findSecret(id)
   if (!row || row.state !== 'active' || !matchesHash(deleteToken, row.delete_hash)) return false
   wipeSecret(id, 'deleted')
   return true
}

export function purgeExpiredSecrets() {
   const now = Date.now()
   db()
      .prepare(
         "UPDATE secrets SET payload = NULL, read_hash = NULL, delete_hash = NULL, state = 'expired', expires_at = ? WHERE state = 'active' AND expires_at <= ?"
      )
      .run(now + TOMBSTONE_TTL_MS, now)
   db().prepare("DELETE FROM secrets WHERE state != 'active' AND expires_at <= ?").run(now)
   db().exec('PRAGMA wal_checkpoint(TRUNCATE)')
}
