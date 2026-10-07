<template>
   <component :is="icon" v-if="icon" class="icon" aria-hidden="true" />
</template>

<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{ name: string }>()

const icons = import.meta.glob<Component>('~/assets/icons/*.svg', {
   query: '?component',
   import: 'default',
   eager: true,
})

const icon = computed(
   () => Object.entries(icons).find(([path]) => path.endsWith(`/${props.name}.svg`))?.[1]
)
</script>
