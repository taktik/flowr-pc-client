import { WebContents } from 'electron'

export function openDevTools(webContents: WebContents, debugMode: boolean): void {
    if (debugMode) {
        webContents.openDevTools({ mode: 'detach' })
    } else {
        webContents.closeDevTools()
    }
}