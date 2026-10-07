<template>
   <div class="view">
      <Transition name="swap" mode="out-in">
         <div v-if="!link" key="form" class="card rise">
            <div class="card-header">
               <h1 class="card-title">Share a secret</h1>
               <p class="card-text">Create a private link to share a password or a note.</p>
            </div>
            <UiTextarea
               v-model="note"
               aria-label="Secret"
               :rows="6"
               :maxlength="MAX_NOTE_LENGTH"
               placeholder="Paste a password, a key or a note"
               @keydown.meta.enter.prevent="askPin"
               @keydown.ctrl.enter.prevent="askPin"
            />
            <div class="actions">
               <UiButton
                  label="Create link"
                  icon="arrow-right"
                  trailing
                  :loading="loading"
                  @click="askPin"
               />
            </div>
         </div>

         <div v-else key="result" class="card">
            <div class="card-header">
               <h1 class="card-title">Link ready</h1>
               <p class="card-text">{{ resultText }}</p>
            </div>
            <UiInput :model-value="link" aria-label="Secret link" copyable />
            <p class="hint">Deleted automatically on {{ formatDate(expiresAt) }}.</p>
            <div class="actions is-split">
               <UiButton label="New secret" variant="ghost" @click="reset" />
               <UiButton
                  :label="copied ? 'Copied' : 'Copy link'"
                  :icon="copied ? 'clipboard-document-check' : 'clipboard-document'"
                  @click="copy(link)"
               />
            </div>
         </div>
      </Transition>

      <UiModal
         v-model:open="pinOpen"
         :title="pinStep ? 'Choose a PIN' : 'Add a PIN?'"
         :text="
            pinStep
               ? `${PIN_LENGTH} digits. Send it to the recipient on a different channel.`
               : 'The recipient must type the PIN to open the secret.'
         "
      >
         <template v-if="!pinStep">
            <div class="actions">
               <UiButton label="No" variant="soft" @click="generate()" />
               <UiButton label="Add PIN" @click="choosePin" />
            </div>
         </template>
         <div v-else class="stack" @keydown.enter.prevent="submitPin">
            <UiPin ref="pinInput" v-model="pin" />
            <div class="actions">
               <UiButton label="Back" variant="ghost" @click="pinStep = false" />
               <UiButton
                  label="Create link"
                  icon="arrow-right"
                  trailing
                  :disabled="!PIN_PATTERN.test(pin)"
                  @click="submitPin"
               />
            </div>
         </div>
      </UiModal>
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
const { notify } = useToast()

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
      notify('Write the secret first.')
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
      notify(
         cause instanceof SecretRequestError && cause.status === 429
            ? 'Too many secrets in a short time. Try again in 15 minutes.'
            : 'The secret was not saved. Try again.'
      )
   } finally {
      loading.value = false
   }
}
</script>
