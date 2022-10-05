type RuntimeMessage = {
  extensionId: string
  portId: string
  sender: chrome.runtime.MessageSender
}

export type RuntimeMessageConnect = RuntimeMessage & { name: string }
export type RuntimeMessageSent = RuntimeMessage & { message: unknown }
