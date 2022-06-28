type IpcBridge = {
    on: (name: string, callback: (evt: import('electron').IpcRendererEvent, ...values: any[]) => void) => void
    off: (name: string, callback: (evt: import('electron').IpcRendererEvent, ...values: any[]) => void) => void
    send: (name: string, ...values: any[]) => void
}

declare const ipc: IpcBridge