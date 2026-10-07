import type { H3Event } from 'h3'

export function requireSecretId(event: H3Event): string {
   const id = getRouterParam(event, 'id') ?? ''
   if (!SECRET_ID_PATTERN.test(id)) {
      throw createError({ statusCode: 404, statusMessage: 'Secret not found' })
   }
   setResponseHeader(event, 'Cache-Control', 'no-store')
   return id
}
