import { ipcMain, app, BrowserWindow, IpcMainEvent } from 'electron'
import { resolve } from 'path'
import { homedir } from 'os'
import { createFlowrWindow, initFlowrConfig, buildBrowserWindowConfig, FRONTEND_CONFIG_NAME, DEFAULT_FRONTEND_STORE } from '../frontend'
import { createWexondWindow, setWexondLog } from '~/main'
import { clearBrowsingData } from '~/main/clearBrowsingData'
import { getMigrateUserPreferences } from './migration/fromFlowrClientToFlowrPcClient'
import { FlowrWindow } from 'src/frontend/flowr-window'
export const log = require('electron-log')
import { StoreManager, Store } from '../frontend/src/store'
import { ApplicationManager } from '../application-manager/application-manager'
import { IFlowrStore } from '../frontend/src/interfaces/flowrStore'
import { keyboard } from '../keyboard/keyboardController'

const FlowrDataDir = resolve(homedir(), '.flowr')

export const storeManager = new StoreManager(FlowrDataDir)
const applicationManager = new ApplicationManager()

async function main() {
  const migrateUserPreferences = getMigrateUserPreferences(`${FRONTEND_CONFIG_NAME}.json`)
  await initFlowrConfig(migrateUserPreferences || {})

  app.commandLine.appendSwitch('widevine-cdm-path', resolve('/Applications/Google Chrome.app/Contents/Versions/74.0.3729.169/Google Chrome Framework.framework/Versions/A/Libraries/WidevineCdm/_platform_specific/mac_x64'))
  // The version of plugin can be got from `chrome://components` page in Chrome.
  app.commandLine.appendSwitch('widevine-cdm-version', '4.10.1303.2')
  const userAppData = resolve(homedir(), '.flowr-electron')

  app.setPath('userData', userAppData)
  log.transports.file.level = 'verbose'
  log.transports.file.file = resolve(app.getPath('userData'), 'log.log')
  setWexondLog(log)
  ipcMain.setMaxListeners(0)

  let flowrWindow: FlowrWindow | null = null

  let browserWindow: BrowserWindow | null = null

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (e, argv) => {
      if (flowrWindow) {
        if (flowrWindow.isMinimized()) flowrWindow.restore()
        flowrWindow.focus()
      }
    })
  }

  process.on('uncaughtException', error => {
    log.error(error)
  })

  async function onReady() {
    await clearBrowsingData()
    const flowrStore = initFlowrStore()

    keyboard.flowrStore = flowrStore

    app.on('activate', async () => {
      if (flowrWindow === null) {
        await initFlowr(flowrStore)
      }
    })
    await initFlowr(flowrStore)

    ipcMain.on('window-focus', () => {
      if (flowrWindow) {
        flowrWindow.webContents.focus()
      }
    })

    ipcMain.on('flowr-desktop-config', (event: IpcMainEvent, desktopConfig: any) => {
      flowrStore.bulkSet(desktopConfig.userPreferences)
      flowrWindow.player.initStore(desktopConfig.player)
    })

    ipcMain.on('open-browser', async (event: Event, options: any) => {
      browserWindow?.close()

      browserWindow = await createWexondWindow(options, flowrWindow || undefined, buildBrowserWindowConfig(flowrStore, {}))

      applicationManager.browserWindow = browserWindow
      browserWindow.webContents.focus()
      browserWindow.on('close', () => {
        browserWindow = null
      })
    })
    ipcMain.on('close-browser', () => {
      if (browserWindow !== null) {
        browserWindow.close()
      }
    })
    ipcMain.on('hide-applications', () => {
      applicationManager.hideAllApplications()
    })
    ipcMain.on('close-applications', () => {
      if (browserWindow !== null) {
        browserWindow.close()
      }
      applicationManager.closeAllApplications()
    })
    ipcMain.on('open-flowr', () => {
      if (browserWindow !== null) {
        browserWindow.close()
      }
      // flowrWindow.moveTop()
    })
  }

  if (app.isReady()) {
    onReady()
  } else {
    app.on('ready', onReady)
  }

  ipcMain.on('clear-application-data', clearBrowsingData)

  app.on('window-all-closed', () => {
    applicationManager.destroy()
    app.quit()
  })

  async function initFlowr(store: Store<IFlowrStore>) {
    try {
      await applicationManager.initLocalApps(!!store.get('clearAppDataOnStart'))
    } catch (e) {
      console.error('Failed to initialize apps', e)
    }

    try {
      flowrWindow = await createFlowrWindow(store)
      applicationManager.flowrWindow = flowrWindow
      flowrWindow.on('close', () => {
        flowrWindow = null
      })
      ipcMain.on('flowrLanguageChanged', (e: Event, lang: string) => applicationManager.languageChanged(lang))
    } catch (e) {
      console.error('Error in init', e)
    }
  }

  function initFlowrStore(): Store<IFlowrStore> {
    return storeManager.createStore(FRONTEND_CONFIG_NAME, DEFAULT_FRONTEND_STORE)
  }
}

main()
