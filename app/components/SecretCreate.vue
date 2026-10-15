<template>
   <div class="view">
      <Transition name="swap" mode="out-in">
         <KCard
            v-if="!link"
            key="form"
            class="card rise"
            title="Share a secret"
            description="Create a private link to share a password or a note."
            :level="1"
         >
            <KStack>
               <KTextarea
                  v-model="note"
                  aria-label="Secret"
                  :rows="6"
                  :maxlength="MAX_NOTE_LENGTH"
                  placeholder="Paste a password, a key or a note"
                  spellcheck="false"
                  no-autofill
                  @keydown.meta.enter.prevent="askPin"
                  @keydown.ctrl.enter.prevent="askPin"
               />
               <div class="actions">
                  <KButton
                     tone="neutral"
                     trailing-icon="arrow-right"
                     :loading="loading"
                     @click="askPin"
                  >
                     Create link
                  </KButton>
               </div>
            </KStack>
         </KCard>

         <KCard
            v-else
            key="result"
            class="card"
            title="Link ready"
            :description="resultText"
            :level="1"
         >
            <KStack>
               <KInput
                  :model-value="link"
                  aria-label="Secret link"
                  class="k-mono"
                  readonly
                  spellcheck="false"
                  no-autofill
                  @focus="($event.target as HTMLInputElement).select()"
               >
                  <template #trailing>
                     <KCopyButton :value="link" />
                  </template>
               </KInput>
               <p class="hint">Deleted automatically on {{ formatDate(expiresAt) }}.</p>
               <div class="actions is-split">
                  <KButton variant="ghost" tone="neutral" @click="reset">New secret</KButton>
                  <KButton
                     tone="neutral"
                     :icon="copied ? 'clipboard-document-check' : 'clipboard-document'"
                     @click="copy(link)"
                  >
                     {{ copied ? 'Copied' : 'Copy link' }}
                  </KButton>
               </div>
            </KStack>
         </KCard>
      </Transition>

      <KModal
         v-model:open="pinOpen"
         size="sm"
         :title="pinStep ? 'Choose a PIN' : 'Add a PIN?'"
         :description="
            pinStep
               ? `${PIN_LENGTH} digits. Send it to the recipient on a different channel.`
               : 'The recipient must type the PIN to open the secret.'
         "
      >
         <div v-if="!pinStep" class="actions">
            <KButton variant="soft" tone="neutral" @click="generate()">No</KButton>
            <KButton tone="neutral" @click="choosePin">Add PIN</KButton>
         </div>
         <KStack v-else @keydown.enter.prevent="submitPin">
            <KPinInput
               ref="pinInput"
               class="pin"
               v-model="pin"
               :length="PIN_LENGTH"
               aria-label="PIN"
               no-autofill
            />
            <div class="actions">
               <KButton variant="ghost" tone="neutral" @click="pinStep = false">Back</KButton>
               <KButton
                  tone="neutral"
                  trailing-icon="arrow-right"
                  :disabled="!PIN_PATTERN.test(pin)"
                  @click="submitPin"
               >
                  Create link
               </KButton>
            </div>
         </KStack>
      </KModal>
   </div>
</template>

<script setup lang="ts">
const note = ref('')
const pin = ref('')
const pinOpen = ref(false)
const pinStep = ref(false)
const pinInput = ref<{ focus: () => void } | null>(null)
const loading = ref(false)
const link = ref('')
const hasPin = ref(false)
const expiresAt = ref(0)

const { copied, copy } = useCopy()

const resultText = computed(() =>
   hasPin.value
      ? 'Send the link and the PIN on two different channels.'
      : 'Anyone with this link can open the secret.'
)

function reset() {
   note.value = ''
   link.value = ''
}

function askPin() {
   if (!note.value.trim()) {
      toast.error('Write the secret first.')
      return
   }
   pin.value = ''
   pinStep.value = false
   pinOpen.value = true
}

async function choosePin() {
   pinStep.value = true
   await nextTick()
   pinInput.value?.focus()
}

function submitPin() {
   if (PIN_PATTERN.test(pin.value)) generate(pin.value)
}

async function generate(withPin?: string) {
   if (loading.value) return
   pinOpen.value = false
   loading.value = true
   try {
      link.value = await createSecret({ type: 'note', text: note.value }, withPin)
      hasPin.value = Boolean(withPin)
      expiresAt.value = Date.now() + SECRET_TTL_MS
      note.value = ''
      pin.value = ''
   } catch (cause) {
      toast.error(
         cause instanceof SecretRequestError && cause.status === 429
            ? 'Too many secrets in a short time. Try again in 15 minutes.'
            : 'The secret was not saved. Try again.'
      )
   } finally {
      loading.value = false
   }
}
</script>
