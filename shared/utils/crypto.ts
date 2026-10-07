import { MASTER_KEY_PATTERN, type SecretContent } from './secret'

const FORMAT_VERSION = 1
const MASTER_KEY_BYTES = 12
const ID_BITS = 72
const IV_BYTES = 12
const TOKEN_BITS = 256
const PIN_ITERATIONS = 300_000
const INFO_PREFIX = 'secret.443.studio/v1/'

type Bytes = Uint8Array<ArrayBuffer>

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type SecretKeys = {
   encryptionKey: CryptoKey
   readToken: string
   deleteToken: string
}

export function toBase64Url(bytes: Uint8Array): string {
   let binary = ''
   for (const byte of bytes) binary += String.fromCharCode(byte)
   return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Bytes {
   const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
   const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
   return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function generateMasterKey(): Bytes {
   return crypto.getRandomValues(new Uint8Array(MASTER_KEY_BYTES))
}

export function parseMasterKey(fragment: string): Bytes | null {
   const text = fragment.replace(/^#/, '')
   if (!MASTER_KEY_PATTERN.test(text)) return null
   return fromBase64Url(text)
}

function hkdfParams(purpose: string) {
   return {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(),
      info: encoder.encode(INFO_PREFIX + purpose),
   }
}

export async function deriveSecretId(master: Bytes): Promise<string> {
   const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits'])
   return toBase64Url(
      new Uint8Array(await crypto.subtle.deriveBits(hkdfParams('id'), base, ID_BITS))
   )
}

async function stretchPin(pin: string, salt: Bytes): Promise<Bytes> {
   const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
      'deriveBits',
   ])
   const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PIN_ITERATIONS },
      material,
      256
   )
   return new Uint8Array(bits)
}

export async function deriveSecretKeys(master: Bytes, pin?: string): Promise<SecretKeys> {
   const input = pin ? concatBytes(master, await stretchPin(pin, master)) : master
   const base = await crypto.subtle.importKey('raw', input, 'HKDF', false, [
      'deriveKey',
      'deriveBits',
   ])
   const encryptionKey = await crypto.subtle.deriveKey(
      hkdfParams('encryption'),
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
   )
   const token = async (purpose: string) =>
      toBase64Url(
         new Uint8Array(await crypto.subtle.deriveBits(hkdfParams(purpose), base, TOKEN_BITS))
      )
   return { encryptionKey, readToken: await token('read'), deleteToken: await token('delete') }
}

export async function sealSecret(content: SecretContent, key: CryptoKey): Promise<Bytes> {
   const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
   const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodeContent(content)
   )
   return concatBytes(Uint8Array.of(FORMAT_VERSION), iv, new Uint8Array(ciphertext))
}

export async function openSecret(sealed: Bytes, key: CryptoKey): Promise<SecretContent> {
   if (sealed[0] !== FORMAT_VERSION) throw new Error('Unsupported secret format')
   const iv = sealed.subarray(1, 1 + IV_BYTES)
   const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      sealed.subarray(1 + IV_BYTES)
   )
   return decodeContent(new Uint8Array(plaintext))
}

export function isSealedSecret(bytes: Uint8Array): boolean {
   return bytes[0] === FORMAT_VERSION && bytes.length > 1 + IV_BYTES + 16
}

function encodeContent(content: SecretContent): Bytes {
   return encoder.encode(JSON.stringify(content))
}

function decodeContent(bytes: Uint8Array): SecretContent {
   const content = JSON.parse(decoder.decode(bytes)) as SecretContent
   if (content?.type !== 'note' || typeof content.text !== 'string') {
      throw new Error('Unsupported secret content')
   }
   return content
}

function concatBytes(...parts: Uint8Array[]): Bytes {
   const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
   let offset = 0
   for (const part of parts) {
      result.set(part, offset)
      offset += part.length
   }
   return result
}
