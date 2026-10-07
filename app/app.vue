<template>
   <div class="page">
      <div class="panel">
         <div class="brand rise">
            <NuxtLink to="/" class="brand-name">secret</NuxtLink>
            <span class="brand-by">by</span>
            <a href="https://443.studio" aria-label="443 studio">
               <UiIcon name="logotype" class="brand-logo" />
            </a>
         </div>
         <NuxtPage />
      </div>
      <UiToaster />
   </div>
</template>

<script setup lang="ts">
useHead({
   script: [
      {
         type: 'application/ld+json',
         innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['Organization', 'ProfessionalService'],
            name: BUSINESS.name,
            legalName: BUSINESS.legalName,
            url: BUSINESS.website,
            logo: `${BUSINESS.website}/apple-touch-icon.png`,
            email: BUSINESS.email,
            vatID: BUSINESS.vat,
            founder: { '@type': 'Person', name: BUSINESS.founder },
            address: { '@type': 'PostalAddress', addressCountry: BUSINESS.countryCode },
            sameAs: BUSINESS_SAME_AS,
         }),
      },
   ],
})
</script>
