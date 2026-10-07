import { markRaw } from 'vue'
import { toast } from 'vue-sonner'
import UiToast from '~/components/UiToast.vue'

const TOAST_DURATION_MS = 4000

export function useToast() {
   function notify(title: string) {
      toast.custom(markRaw(UiToast), {
         componentProps: { title },
         duration: TOAST_DURATION_MS,
      })
   }

   return { notify }
}
