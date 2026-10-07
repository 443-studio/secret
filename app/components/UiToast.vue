<template>
   <div class="toast">
      <UiIcon name="exclamation-circle" class="toast-icon" />
      <p class="toast-title">{{ title }}</p>
   </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
