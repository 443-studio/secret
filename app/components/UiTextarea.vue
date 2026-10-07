<template>
   <div class="input-wrap" :class="{ 'has-trail': copyable }">
      <textarea
         v-bind="$attrs"
         v-model="model"
         :rows="rows ?? 6"
         :readonly="readonly"
         spellcheck="false"
         autocomplete="off"
         data-1p-ignore
         data-lpignore="true"
         data-bwignore
         data-form-type="other"
         class="field"
      />
      <span v-if="copyable" class="input-trail">
         <button
            type="button"
            class="icon-action"
            :class="{ 'is-done': copied }"
            :aria-label="copied ? 'Copied' : 'Copy'"
            :title="copied ? 'Copied' : 'Copy'"
            @click="copy(model ?? '')"
         >
            <UiIcon :name="copied ? 'clipboard-document-check' : 'clipboard-document'" />
         </button>
      </span>
   </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{ rows?: number; readonly?: boolean; copyable?: boolean }>()

const model = defineModel<string>()
const { copied, copy } = useCopy()
</script>
