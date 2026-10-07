<template>
   <div class="view">
      <Transition name="swap" mode="out-in" @after-enter="focusPin">
         <div v-if="view === 'loading'" key="loading" class="spinner">
            <span class="spinner-ring" />
         </div>

         <div v-else-if="view === 'ready'" key="ready" class="card" @keydown.enter.prevent="reveal">
            <div class="card-header">
               <h1 class="card-title">Someone sent you a secret</h1>
               <p class="card-text">{{ readyText }}</p>
            </div>
            <UiPin
               v-if="info?.pin"
               ref="pinInput"
               v-model="pin"
               :error="pinError"
               @complete="reveal"
            />
            <div class="actions">
               <UiButton
                  label="Open secret"
                  icon="arrow-right"
                  trailing
                  :loading="loading"
                  :disabled="info?.pin && !PIN_PATTERN.test(pin)"
                  @click="reveal"
               />
            </div>
         </div>

         <div v-else-if="view === 'revealed'" key="revealed" class="card">
            <div class="card-header">
               <h1 class="card-title">Secret</h1>
               <p class="card-text">Deleted automatically on {{ formatDate(expiresAt) }}.</p>
            </div>
            <UiTextarea :model-value="text" aria-label="Secret" :rows="6" readonly copyable />
            <div class="actions is-split">
               <UiButton
                  :label="confirming ? 'Click again to delete' : 'Delete now'"
                  icon="trash"
                  variant="danger"
                  :loading="loading"
                  @click="destroy"
               />
               <UiButton label="New secret" variant="soft" @click="emit('new')" />
            </div>
         </div>

         <div v-else key="status" class="card">
            <div class="card-header">
               <h1 class="card-title">{{ status.title }}</h1>
               <p class="card-text">{{ status.text }}</p>
            </div>
            <div class="actions">
               <UiButton label="New secret" icon="arrow-right" trailing @click="emit('new')" />
            </div>
         </div>
      </Transition>
   </div>
</template>

<script setup lang="ts">
type StatusView = 'expired' | 'deleted' | 'missing' | 'broken' | 'destroyed'
type View = 'loading' | 'ready' | 'revealed' | StatusView

const STATUS = {
   expired: {
      title: 'This link has expired',
      text: `Secrets are deleted after ${SECRET_TTL_DAYS} days. Ask the sender for a new link.`,
   },
   deleted: {
      title: 'This secret is gone',
      text: 'Someone deleted it, or the PIN was wrong too many times.',
   },
   missing: {
      title: 'This link does not work',
      text: 'There is no secret at this address. Make sure that you copied the full link.',
   },
   broken: {
      title: 'The key is missing',
      text: 'The part of the link after the # sign holds the key. Copy the full link.',
   },
   destroyed: {
      title: 'Secret deleted',
      text: 'The secret no longer exists. The link does not work anymore.',
   },
} as const satisfies Record<StatusView, { title: string; text: string }>

const emit = defineEmits<{ new: [] }>()

let id = ''

const view = ref<View>('loading')
const info = ref<Extract<SecretInfo, { state: 'active' }> | null>(null)
const text = ref('')
const expiresAt = ref(0)
const pin = ref('')
const pinInput = ref<{ focus: () => void } | null>(null)
const pinError = ref(false)
const { notify } = useToast()
const loading = ref(false)
const confirming = ref(false)

let master: Uint8Array<ArrayBuffer> | null = null
let keys: SecretKeys | null = null

const status = computed(() => STATUS[view.value as StatusView])

const readyText = computed(() => {
   if (!info.value?.pin) return 'It stays hidden until you open it.'
   const left = info.value.attemptsLeft
   return `Type the ${PIN_LENGTH}-digit PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`
})

onMounted(async () => {
   master = parseMasterKey(window.location.hash)
   if (!master) {
      view.value = 'broken'
      return
   }
   id = await deriveSecretId(master)
   try {
      const result = await fetchSecretInfo(id)
      if (!result) view.value = 'missing'
      else if (result.state !== 'active') view.value = result.state
      else {
         info.value = result
         view.value = 'ready'
      }
   } catch {
      view.value = 'missing'
   }
})

function focusPin() {
   pinInput.value?.focus()
}

async function reveal() {
   if (!master || !info.value || loading.value) return
   if (info.value.pin && !PIN_PATTERN.test(pin.value)) return
   pinError.value = false
   loading.value = true
   try {
      keys = await deriveSecretKeys(master, info.value.pin ? pin.value : undefined)
      const content = await revealSecret(id, keys)
      text.value = content.text
      expiresAt.value = info.value.expiresAt
      view.value = 'revealed'
   } catch (cause) {
      handleRevealError(cause)
   } finally {
      pin.value = ''
      loading.value = false
   }
}

async function handleRevealError(cause: unknown) {
   if (!(cause instanceof SecretRequestError)) {
      notify('The secret could not be decrypted. Make sure that you copied the full link.')
      return
   }
   if (cause.status === 410) {
      view.value = cause.data.state === 'expired' ? 'expired' : 'deleted'
   } else if (cause.status === 404) {
      view.value = 'missing'
   } else if (cause.status === 403 && info.value) {
      info.value = { ...info.value, attemptsLeft: Number(cause.data.attemptsLeft ?? 0) }
      pinError.value = info.value.pin
      notify(info.value.pin ? 'Wrong PIN.' : 'The link is not correct.')
      await nextTick()
      pinInput.value?.focus()
   } else if (cause.status === 429) {
      notify('Too many attempts. Try again in 15 minutes.')
   } else {
      notify('Something went wrong. Try again.')
   }
}

async function destroy() {
   if (!keys) return
   if (!confirming.value) {
      confirming.value = true
      setTimeout(() => (confirming.value = false), 4000)
      return
   }
   loading.value = true
   try {
      await destroySecret(id, keys)
      text.value = ''
      keys = null
      history.replaceState(null, '', '/')
      view.value = 'destroyed'
   } catch {
      notify('The secret was not deleted. Try again.')
   } finally {
      loading.value = false
      confirming.value = false
   }
}
</script>
