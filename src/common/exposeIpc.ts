import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

export function exposeIpc(enabledEvents: string[] | '*', as = 'ipc'): void {
    function filterEnabledEvent(name: string) {
        if (enabledEvents === '*') return
        if (!enabledEvents.includes(name)) {
            throw Error(`Event ${name} is not supported`)
        }
    }
    
    const ipcBridge: IpcBridge = {
        on: (name: string, callback: (evt: IpcRendererEvent, ...values: any[]) => void) => {
            filterEnabledEvent(name)
            ipcRenderer.on(name, callback)
        },
        off: (name: string, callback: (evt: IpcRendererEvent, ...values: any[]) => void) => {
            filterEnabledEvent(name)
            ipcRenderer.off(name, callback)
        },
        send: (name: string, ...values: any[]) => {
            filterEnabledEvent(name)
            ipcRenderer.send(name, ...values)
        }
    }
    
    contextBridge.exposeInMainWorld(as, ipcBridge)
}