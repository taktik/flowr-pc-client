import {
  ipcMain,
  IpcMainEvent,
} from 'electron'
import { appWindow } from '.'

ipcMain.on('api-tabs-query', (e: IpcMainEvent) => {
  appWindow.webContents.send('api-tabs-query', e.sender.id)
})

ipcMain.on(
  'api-tabs-create',
  (e: IpcMainEvent, data: chrome.tabs.CreateProperties) => {
    appWindow.webContents.send('api-tabs-create', data, e.sender.id)
  },
)

ipcMain.on(
  'api-tabs-insertCSS',
  (e: IpcMainEvent, tabId: number, details: chrome.tabs.InjectDetails) => {
    const view = appWindow.viewManager.views[tabId]

    if (view) {
      view.webContents.insertCSS(details.code).catch(console.error)
      e.sender.send('api-tabs-insertCSS')
    }
  },
)

ipcMain.on(
  'api-port-postMessage',
  (e: IpcMainEvent, { portId, msg }: { portId: string, msg: any }) => {
    for (const key in appWindow.viewManager.views) {
      const view = appWindow.viewManager.views[key]
      if (view.webContents.id !== e.sender.id) {
        view.webContents.send(`api-port-postMessage-${portId}`, msg)
      }
    }
  },
)

ipcMain.on('emit-tabs-event', (e: any, name: string, ...data: any[]) => {
  appWindow.viewManager.sendToAll(`api-emit-event-tabs-${name}`, ...data)
})
