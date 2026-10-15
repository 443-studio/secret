<template>
   <div class="view">
      <Transition name="swap" mode="out-in" @after-enter="focusPin">
         <div v-if="view === 'loading'" key="loading" class="spinner">
            <KSpinner />
         </div>

         <KCard
            v-else-if="view === 'ready'"
            key="ready"
            class="card"
            title="Someone sent you a secret"
            :description="readyText"
            :level="1"
            @keydown.enter.prevent="reveal"
         >
            <KStack>
               <KPinInput
                  v-if="info?.pin"
                  ref="pinInput"
                  class="pin"
                  v-model="pin"
                  :length="PIN_LENGTH"
                  :invalid="pinError"
                  aria-label="PIN"
                  no-autofill
                  @complete="reveal"
               />
               <div class="actions">
                  <KButton
                     tone="neutral"
                     trailing-icon="arrow-right"
                     :loading="loading"
                     :disabled="info?.pin && !PIN_PATTERN.test(pin)"
                     @click="reveal"
                  >
                     Open secret
                  </KButton>
               </div>
            </KStack>
         </KCard>

         <KCard
            v-else-if="view === 'revealed'"
            key="revealed"
            class="card"
            title="Secret"
            :description="`Deleted automatically on ${formatDate(expiresAt)}.`"
            :level="1"
         >
            <KStack>
               <KTextarea
                  :model-value="text"
                  aria-label="Secret"
                  :rows="6"
                  readonly
                  spellcheck="false"
                  no-autofill
               >
                  <template #trailing>
                     <KCopyButton :value="text" />
                  </template>
               </KTextarea>
               <div class="actions is-split">
                  <KButton
                     icon="trash"
                     variant="ghost"
                     tone="danger"
                     :loading="loading"
                     @click="destroy"
                  >
                     {{ confirming ? 'Click again to delete' : 'Delete now' }}
                  </KButton>
                  <KButton variant="soft" tone="neutral" @click="emit('new')">New secret</KButton>
               </div>
            </KStack>
         </KCard>

         <KCard
            v-else
            key="status"
            class="card"
            :title="status.title"
            :description="status.text"
            :level="1"
         >
            <KStack>
               <div class="actions">
                  <KButton tone="neutral" trailing-icon="arrow-right" @click="emit('new')">
                     New secret
                  </KButton>
               </div>
            </KStack>
         </KCard>
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
      toast.error('The secret could not be decrypted. Make sure that you copied the full link.')
      return
   }
   if (cause.status === 410) {
      view.value = cause.data.state === 'expired' ? 'expired' : 'deleted'
   } else if (cause.status === 404) {
      view.value = 'missing'
   } else if (cause.status === 403 && info.value) {
      info.value = { ...info.value, attemptsLeft: Number(cause.data.attemptsLeft ?? 0) }
      pinError.value = info.value.pin
      toast.error(info.value.pin ? 'Wrong PIN.' : 'The link is not correct.')
      await nextTick()
      pinInput.value?.focus()
   } else if (cause.status === 429) {
      toast.error('Too many attempts. Try again in 15 minutes.')
   } else {
      toast.error('Something went wrong. Try again.')
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
      toast.error('The secret was not deleted. Try again.')
   } finally {
      loading.value = false
      confirming.value = false
   }
}
</script>
