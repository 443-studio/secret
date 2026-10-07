<template>
   <Teleport to="body">
      <Transition name="modal">
         <div v-if="open" class="overlay" @click.self="open = false">
            <div class="modal" role="dialog" aria-modal="true" :aria-label="title">
               <div class="card-header">
                  <h2 class="card-title">{{ title }}</h2>
                  <p v-if="text" class="card-text">{{ text }}</p>
               </div>
               <slot />
            </div>
         </div>
      </Transition>
   </Teleport>
</template>

<script setup lang="ts">
defineProps<{ title: string; text?: string }>()

const open = defineModel<boolean>('open', { default: false })

function onKeydown(event: KeyboardEvent) {
   if (event.key === 'Escape') open.value = false
}

watch(open, (value) => {
   if (value) document.addEventListener('keydown', onKeydown)
   else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>
