import { ref } from "vue"

export type MessageTone = "info" | "warning" | "success"

export function useAppMessage() {
  const appMessage = ref("")
  const appMessageTone = ref<MessageTone>("info")

  function setMessage(message: string, tone: MessageTone = "info"): void {
    appMessage.value = message
    appMessageTone.value = tone
  }

  function clearMessage(): void {
    appMessage.value = ""
  }

  return { appMessage, appMessageTone, setMessage, clearMessage }
}
