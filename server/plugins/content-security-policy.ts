import { createHash } from 'node:crypto'

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi

function inlineScriptHashes(html: string): string[] {
   return [...html.matchAll(INLINE_SCRIPT)]
      .map(([, body]) => body)
      .filter((body): body is string => Boolean(body))
      .map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`)
}

export default defineNitroPlugin((nitro) => {
   if (import.meta.dev) return
   nitro.hooks.hook('render:response', (response) => {
      if (typeof response.body !== 'string') return
      response.headers ??= {}
      response.headers['Content-Security-Policy'] = [
         "default-src 'none'",
         `script-src 'self' ${inlineScriptHashes(response.body).join(' ')}`.trim(),
         "style-src 'self' 'unsafe-inline'",
         "img-src 'self' data: blob:",
         "font-src 'self'",
         "connect-src 'self'",
         "manifest-src 'self'",
         "base-uri 'none'",
         "form-action 'self'",
         "frame-ancestors 'none'",
         "object-src 'none'",
         'upgrade-insecure-requests',
      ].join('; ')
   })
})
