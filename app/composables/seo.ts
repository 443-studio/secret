export interface SeoOptions {
   title?: MaybeRefOrGetter<string | undefined>
   description?: MaybeRefOrGetter<string | undefined>
   noindex?: boolean
}

const NOINDEX = 'noindex, nofollow'
const TAB_TITLE = `Secret | ${BUSINESS.name}`

export function useSeo(options: SeoOptions = {}) {
   const configuredUrl = useRuntimeConfig().public.siteUrl
   const siteUrl = (configuredUrl || useRequestURL().origin).replace(/\/+$/, '')

   const pageTitle = computed(() => {
      const title = toValue(options.title)
      return title ? `${title} | ${BUSINESS.name}` : TAB_TITLE
   })
   const pageDescription = computed(() => toValue(options.description) || SITE_DESCRIPTION)
   const ogImageUrl = `${siteUrl}${BUSINESS_OG_IMAGE.url}`

   const route = useRoute()

   useHead(() => ({
      title: TAB_TITLE,
      titleTemplate: '%s',
      link: options.noindex ? [] : [{ rel: 'canonical', href: `${siteUrl}${route.path}` }],
   }))

   useSeoMeta({
      description: () => pageDescription.value,
      ogTitle: () => pageTitle.value,
      ogDescription: () => pageDescription.value,
      ogType: 'website',
      ogUrl: () => (options.noindex ? undefined : `${siteUrl}${route.path}`),
      ogSiteName: BUSINESS.name,
      ogImage: ogImageUrl,
      ogImageType: BUSINESS_OG_IMAGE.type,
      ogImageWidth: BUSINESS_OG_IMAGE.width,
      ogImageHeight: BUSINESS_OG_IMAGE.height,
      ogImageAlt: () => pageTitle.value,
      robots: options.noindex ? NOINDEX : undefined,
   })
}
