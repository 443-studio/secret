export default defineEventHandler((event) => {
   enforceRateLimit(event, 'read', 120)
   const id = requireSecretId(event)
   if (!deleteSecret(id, getRequestHeader(event, 'x-delete-token') ?? '')) {
      throw createError({ statusCode: 404, statusMessage: 'Secret not found' })
   }
   setResponseStatus(event, 204)
   return null
})
