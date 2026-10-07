import type { H3Event } from 'h3'

export type PlainSecret = { content: SecretContent; pin?: string }

function invalid(message: string): never {
   throw createError({ statusCode: 400, statusMessage: message })
}

function buildSecret(text: unknown, pin: unknown): PlainSecret {
   if (typeof text !== 'string' || text.trim().length === 0) invalid('Missing "text"')
   if (text.length > MAX_NOTE_LENGTH) invalid(`"text" is longer than ${MAX_NOTE_LENGTH} characters`)
   if (pin !== undefined && pin !== null && pin !== '') {
      if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) {
         invalid(`"pin" must be ${PIN_LENGTH} digits`)
      }
      return { content: { type: 'note', text }, pin }
   }
   return { content: { type: 'note', text } }
}

function fromJson(raw: string): PlainSecret {
   let body: unknown
   try {
      body = JSON.parse(raw)
   } catch {
      invalid('The body is not valid JSON')
   }
   if (!body || typeof body !== 'object' || Array.isArray(body))
      invalid('The body must be an object')
   const { text, pin } = body as Record<string, unknown>
   return buildSecret(text, pin)
}

function fromUrlEncoded(raw: string): PlainSecret {
   const params = new URLSearchParams(raw)
   if (params.has('text')) return buildSecret(params.get('text'), params.get('pin') ?? undefined)
   return buildSecret(raw, undefined)
}

export async function readPlainSecret(event: H3Event): Promise<PlainSecret> {
   const contentType = getRequestHeader(event, 'content-type')?.toLowerCase() ?? ''
   const raw = (await readRawBody(event, 'utf8')) ?? ''
   if (contentType.startsWith('application/json')) return fromJson(raw)
   if (contentType.startsWith('application/x-www-form-urlencoded')) return fromUrlEncoded(raw)
   return buildSecret(raw, undefined)
}
