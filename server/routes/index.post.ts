import type { H3Event } from 'h3'

function requireBodyLength(event: H3Event) {
   const length = Number(getRequestHeader(event, 'content-length'))
   if (!Number.isFinite(length) || length <= 0) {
      throw createError({ statusCode: 411, statusMessage: 'Content-Length is required' })
   }
   if (length > MAX_BODY_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'The secret is too large' })
   }
}

async function readSealedSecret(event: H3Event) {
   const id = getRequestHeader(event, 'x-secret-id') ?? ''
   if (!SECRET_ID_PATTERN.test(id)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid secret id' })
   }
   const readToken = getRequestHeader(event, 'x-read-token') ?? ''
   const deleteToken = getRequestHeader(event, 'x-delete-token') ?? ''
   if (!TOKEN_PATTERN.test(readToken) || !TOKEN_PATTERN.test(deleteToken)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid tokens' })
   }
   const payload = new Uint8Array((await readRawBody(event, false)) ?? [])
   if (!isSealedSecret(payload) || payload.length > MAX_SEALED_BYTES) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid encrypted payload' })
   }
   return {
      id,
      payload,
      readToken,
      deleteToken,
      hasPin: getRequestHeader(event, 'x-pin') === '1',
   }
}

const CREATE_ATTEMPTS = 3

async function storePlainSecret(event: H3Event): Promise<string> {
   const { content, pin } = await readPlainSecret(event)
   for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
      const master = generateMasterKey()
      const keys = await deriveSecretKeys(master, pin)
      const stored = insertSecret({
         id: await deriveSecretId(master),
         payload: await sealSecret(content, keys.encryptionKey),
         readToken: keys.readToken,
         deleteToken: keys.deleteToken,
         hasPin: Boolean(pin),
      })
      if (stored) return `#${toBase64Url(master)}`
   }
   throw createError({ statusCode: 500, statusMessage: 'Could not store the secret' })
}

async function storeSealedSecret(event: H3Event): Promise<string> {
   if (!insertSecret(await readSealedSecret(event))) {
      throw createError({ statusCode: 409, statusMessage: 'Secret id already exists' })
   }
   return ''
}

function siteOrigin(event: H3Event): string {
   const configured = useRuntimeConfig(event).public.siteUrl
   return (
      configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
   ).replace(/\/+$/, '')
}

export default defineEventHandler(async (event) => {
   enforceRateLimit(event, 'create', 30)
   requireBodyLength(event)
   const isSealed = getRequestHeader(event, 'content-type')?.startsWith('application/octet-stream')
   const fragment = isSealed ? await storeSealedSecret(event) : await storePlainSecret(event)
   setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
   setResponseHeader(event, 'Cache-Control', 'no-store')
   setResponseStatus(event, 201)
   return `${siteOrigin(event)}/${fragment}\n`
})
