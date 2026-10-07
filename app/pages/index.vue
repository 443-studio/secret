<template>
   <Transition name="swap" mode="out-in">
      <SecretView v-if="mode === 'view'" :key="viewKey" @new="startNew" />
      <SecretCreate v-else-if="mode === 'create'" />
   </Transition>
</template>

<script setup lang="ts">
useSeo({ title: 'Share a secret' })

const mode = ref<'pending' | 'create' | 'view'>('pending')
const viewKey = ref(0)

function sync() {
   mode.value = window.location.hash.length > 1 ? 'view' : 'create'
   viewKey.value++
}

function startNew() {
   history.replaceState(null, '', '/')
   mode.value = 'create'
}

onMounted(() => {
   sync()
   window.addEventListener('hashchange', sync)
})

onBeforeUnmount(() => window.removeEventListener('hashchange', sync))
</script>
