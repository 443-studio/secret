const securityHeaders = {
   'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
   'X-Content-Type-Options': 'nosniff',
   'X-Frame-Options': 'DENY',
   'Referrer-Policy': 'no-referrer',
   'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
   'Cross-Origin-Opener-Policy': 'same-origin',
   'Cross-Origin-Resource-Policy': 'same-origin',
}

export default defineNuxtConfig({
   compatibilityDate: '2025-07-15',
   devtools: { enabled: false },
   telemetry: { enabled: false },
   features: { inlineStyles: false },

   modules: ['@xleddyl/443-components-vue/nuxt'],

   k: {
      global: true,
      theme: { cookie: false, default: 'dark' },
      preset: { cookie: false },
      icons: { dir: '~/assets/icons' },
   },

   runtimeConfig: {
      dbPath: 'data/secrets.db',
      public: {
         siteUrl: '',
      },
   },

   nitro: {
      routeRules: {
         '/**': { headers: { ...securityHeaders, 'Cache-Control': 'no-store' } },
         '/_nuxt/**': {
            headers: { ...securityHeaders, 'Cache-Control': 'public, max-age=31536000, immutable' },
         },
      },
   },

   app: {
      head: {
         htmlAttrs: { lang: 'en' },
         meta: [
            { charset: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { name: 'theme-color', content: '#0d0d0f' },
         ],
         link: [
            { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
            { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
            { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
         ],
      },
   },

   css: ['~/assets/css/main.css'],
})
