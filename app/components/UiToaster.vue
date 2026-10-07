<template>
   <Toaster position="top-center" :offset="16" :gap="8" :visible-toasts="4" />
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>
