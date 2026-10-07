<template>
   <div class="pin" @mousedown.prevent="focus">
      <div
         ref="input"
         contenteditable="true"
         inputmode="numeric"
         role="textbox"
         aria-label="Access digits"
         spellcheck="false"
         autocorrect="off"
         autocapitalize="off"
         class="pin-input"
         @input="onInput"
         @keydown.enter.prevent
         @focus="focused = true"
         @blur="focused = false"
      />
      <span
         v-for="(digit, index) in digits"
         :key="index"
         class="field pin-box"
         :class="{ 'is-active': focused && index === activeIndex, 'is-error': error }"
         aria-hidden="true"
      >
         {{ digit }}
      </span>
   </div>
</template>

<script setup lang="ts">
defineProps<{ error?: boolean }>()

const model = defineModel<string>({ required: true })
const emit = defineEmits<{ complete: [string] }>()

const input = ref<HTMLDivElement | null>(null)
const focused = ref(false)

const digits = computed(() =>
   Array.from({ length: PIN_LENGTH }, (_, index) => model.value[index] ?? '')
)
const activeIndex = computed(() => Math.min(model.value.length, PIN_LENGTH - 1))

watch(model, (value) => {
   if (input.value && input.value.textContent !== value) input.value.textContent = value
})

function moveCaretToEnd(element: HTMLElement) {
   const range = document.createRange()
   range.selectNodeContents(element)
   range.collapse(false)
   const selection = window.getSelection()
   selection?.removeAllRanges()
   selection?.addRange(range)
}

function onInput() {
   const element = input.value
   if (!element) return
   const value = (element.textContent ?? '').replace(/\D/g, '').slice(0, PIN_LENGTH)
   if (element.textContent !== value) {
      element.textContent = value
      moveCaretToEnd(element)
   }
   model.value = value
   if (value.length === PIN_LENGTH) emit('complete', value)
}

function focus() {
   const element = input.value
   if (!element) return
   element.focus()
   moveCaretToEnd(element)
}

defineExpose({ focus })
</script>
