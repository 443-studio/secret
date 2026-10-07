<template>
   <component
      :is="to ? NuxtLink : 'button'"
      :to="to"
      :type="to ? undefined : type"
      :disabled="to ? undefined : disabled || loading"
      :class="['btn', `btn-${variant}`, `btn-${size}`, { 'is-block': block }]"
   >
      <UiIcon v-if="loading" name="arrow-path" class="spin" />
      <UiIcon v-else-if="icon && !trailing" :name="icon" />
      <slot>{{ label }}</slot>
      <UiIcon v-if="icon && trailing && !loading" :name="icon" :data-icon="icon" />
   </component>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'

withDefaults(
   defineProps<{
      label?: string
      icon?: string
      trailing?: boolean
      to?: string
      type?: 'button' | 'submit'
      variant?: 'solid' | 'soft' | 'ghost' | 'danger'
      size?: 'md' | 'lg'
      block?: boolean
      disabled?: boolean
      loading?: boolean
   }>(),
   { type: 'button', variant: 'solid', size: 'md' }
)
</script>
