export default defineEventHandler((event) => {
   enforceRateLimit(event, 'read', 120)
   const id = requireSecretId(event)
   const result = readSecret(id, getRequestHeader(event, 'x-read-token') ?? '')
   if (result.status === 'missing') {
      throw createError({ statusCode: 404, statusMessage: 'Secret not found' })
   }
   if (result.status === 'gone') {
      throw createError({
         statusCode: 410,
         statusMessage: 'Secret gone',
         data: { state: result.state },
      })
   }
   if (result.status === 'denied') {
      throw createError({
         statusCode: 403,
         statusMessage: 'Wrong PIN',
         data: { attemptsLeft: result.attemptsLeft },
      })
   }
   setResponseHeader(event, 'Content-Type', 'application/octet-stream')
   setResponseHeader(event, 'X-Expires-At', String(result.expiresAt))
   return Buffer.from(result.payload)
})
