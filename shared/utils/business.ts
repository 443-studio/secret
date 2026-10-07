export const BUSINESS = {
   name: '443 studio',
   legalName: 'Hex-Code di Edoardo Alberti',
   founder: 'Edoardo Alberti',
   email: 'hello@443.studio',
   website: 'https://443.studio',
   countryCode: 'IT',
   vat: 'IT02797400021',
} as const

export const BUSINESS_SAME_AS = [
   'https://github.com/443-studio',
   'https://www.instagram.com/443.studio/',
] as const

export const BUSINESS_OG_IMAGE = {
   url: '/og-image.jpg',
   width: 1200,
   height: 630,
   type: 'image/jpeg',
} as const

export const SITE_DESCRIPTION =
   'Share passwords, notes and files with an encrypted link that expires after 5 days.'
