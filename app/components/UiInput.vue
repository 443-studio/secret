<template>
   <div class="input-wrap" :class="{ 'has-trail': copyable }">
      <input
         v-bind="$attrs"
         :value="modelValue"
         readonly
         spellcheck="false"
         autocomplete="off"
         data-1p-ignore
         data-lpignore="true"
         data-bwignore
         data-form-type="other"
         class="field is-mono"
         @focus="($event.target as HTMLInputElement).select()"
      />
      <span v-if="copyable" class="input-trail">
         <button
            type="button"
            class="icon-action"
            :class="{ 'is-done': copied }"
            :aria-label="copied ? 'Copied' : 'Copy'"
            :title="copied ? 'Copied' : 'Copy'"
            @click="copy(modelValue)"
         >
            <UiIcon :name="copied ? 'clipboard-document-check' : 'clipboard-document'" />
         </button>
      </span>
   </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{ modelValue: string; copyable?: boolean }>()

const { copied, copy } = useCopy()
</script>
