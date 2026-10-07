import type { H3Event } from 'h3'

type Bucket = { count: number; resetAt: number }

const WINDOW_MS = 15 * 60 * 1000
const buckets = new Map<string, Bucket>()

function clientAddress(event: H3Event): string {
   const forwarded = getRequestHeader(event, 'x-forwarded-for')
   const lastHop = forwarded?.split(',').at(-1)?.trim()
   return lastHop || event.node.req.socket.remoteAddress || 'unknown'
}

export function enforceRateLimit(event: H3Event, scope: string, limit: number) {
   const key = `${scope}:${clientAddress(event)}`
   const now = Date.now()
   const bucket = buckets.get(key)
   if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return
   }
   bucket.count++
   if (bucket.count > limit) {
      setResponseHeader(event, 'Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
   }
}

export function sweepRateLimits() {
   const now = Date.now()
   for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
   }
}
