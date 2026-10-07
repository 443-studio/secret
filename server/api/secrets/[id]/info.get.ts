export default defineEventHandler((event) => {
   enforceRateLimit(event, 'read', 120)
   const info = secretInfo(requireSecretId(event))
   if (!info) throw createError({ statusCode: 404, statusMessage: 'Secret not found' })
   return info
})
