import {
  webContents,
  WebContents,
  ipcMain,
  IpcMainEvent,
} from 'electron'
import { mkdir, readFile, readdir } from 'fs/promises'
import { format } from 'url'
import { resolve } from 'path'

import { getPath } from '~/shared/utils/paths/main'
import { Extension, StorageArea } from './models'
import { IpcExtension } from '~/shared/models'
import { appWindow } from '.'
import { buildPreloadPath } from '../../common/preload'
import { RuntimeMessageConnect, RuntimeMessageSent } from '../shared/utils/extensions'
import { ExecuteScriptProps } from '../preloads/view-preload'
import { getLogger } from 'src/frontend/src/logging/loggers'

type StorageOperationDetails = {
  extensionId: string
  id: string
  arg: any
  type: string
  area: string
}

export const extensions: { [key: string]: Extension } = {}
const log = getLogger('Load extensions')

export const getIpcExtension = (id: string): IpcExtension => {
  const ipcExtension: Extension = {
    ...extensions[id],
  }

  delete ipcExtension.databases

  return ipcExtension
}

export const startBackgroundPage = async (extension: Extension): Promise<void> => {
  const { manifest, path, id } = extension

  if (manifest.background) {
    const { background } = manifest
    const { page, scripts } = background

    let html = Buffer.from('')
    let fileName: string

    if (page) {
      fileName = page
      html = await readFile(resolve(path, page))
    } else if (scripts) {
      fileName = 'generated.html'
      html = Buffer.from(
        `<html>
          <body>${scripts
            .map(script => `<script src="${script}"></script>`)
            .join('')}
          </body>
        </html>`,
        'utf8',
      )
    }

    try {
      /**
       * WebContents.create's static function exists as a private method.
       * Do not know why it was used by original writer though,
       * thus the awful typing and the lint disable.
       * May be a cause of crash at some point, this is why we try/catch it
       */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const contents: WebContents = (webContents as any).create({
        partition: 'persist:wexond_extension',
        isBackgroundPage: true,
        commandLineSwitches: ['--background-page'],
        preload: buildPreloadPath('background-preload.js'),
        webPreferences: {
          webSecurity: false,
          nodeIntegration: false,
          contextIsolation: false,
        },
      }) as WebContents

      extension.backgroundPage = {
        html,
        fileName,
        webContentsId: contents.id,
      }

      if (process.env.ENV === 'dev') {
        contents.openDevTools({ mode: 'detach' })
      }

      await contents.loadURL(
        format({
          protocol: 'wexond-extension',
          slashes: true,
          hostname: id,
          pathname: fileName,
        }),
      )
    } catch(e) {
      console.error('Failed to start extension', extension.id, 'at path', extension.path, e)
    }
  }
}

export const loadExtensions = async (): Promise<void> => {
  const extensionsPath = getPath('extensions')
  let files: string[] = []

  try {
    files = await readdir(extensionsPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Create dir if it does not exist and continue: it will be empty anyway
      await mkdir(extensionsPath)
    } else {
      throw error
    }
  }

  for (const dir of files) {
    const extensionPath = resolve(extensionsPath, dir)
    const manifestPath = resolve(extensionPath, 'manifest.json')

    try {
          const manifest = JSON.parse(
            await readFile(manifestPath, 'utf8'),
          ) as chrome.runtime.Manifest
  
          const id = dir.toLowerCase()
  
          if (extensions[id]) {
            continue
          }
  
          const storagePath = getPath('storage/extensions', id)
          const local = new StorageArea(resolve(storagePath, 'local'))
          const sync = new StorageArea(resolve(storagePath, 'sync'))
          const managed = new StorageArea(resolve(storagePath, 'managed'))
  
          const extension: Extension = {
            manifest,
            alarms: [],
            databases: { local, sync, managed },
            path: extensionPath,
            id,
          }
  
          extensions[id] = extension
  
          if (typeof manifest.default_locale === 'string') {
            const defaultLocalePath = resolve(
              extensionPath,
              '_locales',
              manifest.default_locale,
            )
  
            const messagesPath = resolve(defaultLocalePath, 'messages.json')

            try {
              const data = await readFile(messagesPath, 'utf8')
              const locale = JSON.parse(data) as string // Not sure about this type, and no info to be found anywhere...
  
              extension.locale = locale
            } catch (error) {
              const errorCode = (error as NodeJS.ErrnoException).code
              // ignore error if file does not exist
              if (errorCode !== 'ENOENT') {
                throw error
              }
            }
          }
  
          await startBackgroundPage(extension)
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code
      
      if (errorCode !== 'ENOENT') {
        log.warn('Failed to load extension at path', extensionPath, error)
      }
    }
  }
}

ipcMain.on('get-extension', (e: IpcMainEvent, id: string) => {
  e.returnValue = getIpcExtension(id)
})

ipcMain.on('get-extensions', (e: IpcMainEvent) => {
  const list: { [key: string]: IpcExtension } = {}

  for (const key in extensions) {
    list[key] = getIpcExtension(key)
  }

  e.returnValue = list
})

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

ipcMain.on('api-tabs-executeScript', (e: IpcMainEvent, data: ExecuteScriptProps) => {
  const { tabId } = data
  const view = appWindow.viewManager.views[tabId]

  if (view) {
    view.webContents.send('execute-script-isolated', data, e.sender.id)
  }
})

ipcMain.on('api-runtime-reload', (e: IpcMainEvent, extensionId: string) => {
  const { backgroundPage } = extensions[extensionId]

  if (backgroundPage) {
    const contents = webContents.fromId(e.sender.id)
    contents.reload()
  }
})

ipcMain.on(
  'api-runtime-connect',
  (e: IpcMainEvent, { extensionId, portId, sender, name }: RuntimeMessageConnect) => {
    const { backgroundPage } = extensions[extensionId]

    if (e.sender.id !== backgroundPage.webContentsId) {
      const view = webContents.fromId(backgroundPage.webContentsId)

      if (view) {
        view.send('api-runtime-connect', {
          portId,
          sender,
          name,
        })
      }
    }
  },
)

ipcMain.on('api-runtime-sendMessage', (e: IpcMainEvent, data: RuntimeMessageSent) => {
  const { extensionId } = data
  const { backgroundPage } = extensions[extensionId]

  if (e.sender.id !== backgroundPage.webContentsId) {
    const view = webContents.fromId(backgroundPage.webContentsId)

    if (view) {
      view.send('api-runtime-sendMessage', data, e.sender.id)
    }
  }
})

ipcMain.on(
  'api-port-postMessage',
  (e: IpcMainEvent, { portId, msg }: { portId: string, msg: any }) => {
    Object.keys(extensions).forEach(key => {
      const { backgroundPage } = extensions[key]

      if (e.sender.id !== backgroundPage.webContentsId) {
        const contents = webContents.fromId(backgroundPage.webContentsId)
        contents.send(`api-port-postMessage-${portId}`, msg)
      }
    })

    for (const key in appWindow.viewManager.views) {
      const view = appWindow.viewManager.views[key]
      if (view.webContents.id !== e.sender.id) {
        view.webContents.send(`api-port-postMessage-${portId}`, msg)
      }
    }
  },
)

ipcMain.on(
  'api-storage-operation',
  (e: IpcMainEvent, { extensionId, id, area, type, arg }: StorageOperationDetails) => {
    const { databases } = extensions[extensionId]

    const contents = webContents.fromId(e.sender.id)
    const msg = `api-storage-operation-${id}`

    if (type === 'get') {
      databases[area].get(arg, (d: {[key: string]: unknown}) => {
        for (const key in d) {
          const dd = d[key]
          if (Buffer.isBuffer(dd)) {
            d[key] = JSON.parse(dd.toString()) as unknown
          }
        }
        contents.send(msg, d)
      })
    } else if (type === 'set') {
      databases[area].set(arg, () => {
        contents.send(msg)
      })
    } else if (type === 'clear') {
      databases[area].clear(() => {
        contents.send(msg)
      })
    } else if (type === 'remove') {
      databases[area].set(arg, () => {
        contents.send(msg)
      })
    }
  },
)

ipcMain.on(
  'api-browserAction-setBadgeText',
  (e: IpcMainEvent, ...args: any[]) => {
    appWindow.webContents.send(
      'api-browserAction-setBadgeText',
      e.sender.id,
      ...args,
    )
  },
)

ipcMain.on(
  'send-to-all-extensions',
  (e: IpcMainEvent, msg: string, ...args: any[]) => {
    sendToAllExtensions(msg, ...args)
    appWindow.viewManager.sendToAll(msg, ...args)
  },
)

ipcMain.on('emit-tabs-event', (e: any, name: string, ...data: any[]) => {
  appWindow.viewManager.sendToAll(`api-emit-event-tabs-${name}`, ...data)
  sendToAllExtensions(`api-emit-event-tabs-${name}`, ...data)
})

export const sendToAllExtensions = (msg: string, ...args: any[]): void => {
  for (const key in extensions) {
    const ext = extensions[key]

    const view = webContents.fromId(ext.backgroundPage.webContentsId)

    if (view) {
      view.send(msg, ...args)
    }
  }
}
