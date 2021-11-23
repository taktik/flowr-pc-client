import { ipcMain, app, BrowserWindow, IpcMainEvent } from 'electron'
import { resolve } from 'path'
import { homedir } from 'os'
import { createFlowrWindow, initFlowrConfig, buildBrowserWindowConfig, FRONTEND_CONFIG_NAME, DEFAULT_FRONTEND_STORE } from '../frontend'
import { createWexondWindow, setWexondLog } from '~/main'
import { clearBrowsingData } from '~/main/clearBrowsingData'
import { getMigrateUserPreferences } from './migration/fromFlowrClientToFlowrPcClient'
import type { FlowrWindow } from 'src/frontend/flowr-window'
import { StoreManager, Store } from '../frontend/src/store'
import { ApplicationManager } from '../application-manager/application-manager'
import { IFlowrStore } from '../frontend/src/interfaces/flowrStore'
import { keyboard } from '../keyboard/keyboardController'
import { mergeWith, cloneDeep } from 'lodash'
import { FullScreenManager } from '../common/fullscreen'
import type { WexondOptions } from '../wexond/main/app-window'
import { IPlayerStore } from '../frontend/src/interfaces/playerStore'
import log from 'electron-log'

const FlowrDataDir = resolve(homedir(), '.flowr')

export const storeManager = new StoreManager(FlowrDataDir)
const applicationManager = new ApplicationManager()

async function main() {
  const migrateUserPreferences = getMigrateUserPreferences(`${FRONTEND_CONFIG_NAME}.json`)
  await initFlowrConfig(migrateUserPreferences)

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
    app.on('second-instance', () => {
      if (flowrWindow) {
        if (flowrWindow.isMinimized()) flowrWindow.restore()
        flowrWindow.focus()
      }
    })
  }

  process.on('uncaughtException', error => {
    log.error(error)
  })

  const openBrowserWindow = async (
    flowrStore: Store<IFlowrStore>,
    event: Event,
    options: Omit<WexondOptions, 'enableVirtualKeyboard'>,
  ): Promise<BrowserWindow> => {

    browserWindow?.close()

    const wexondOptions = {
      ...options,
      enableVirtualKeyboard: flowrStore.get('enableVirtualKeyboard'),
    }

    browserWindow = await createWexondWindow(wexondOptions, flowrWindow || undefined, buildBrowserWindowConfig(flowrStore, {}))
    FullScreenManager.applySameWindowState(flowrWindow, browserWindow)
    applicationManager.browserWindow = browserWindow

    flowrWindow.webContents.setAudioMuted(true)
    browserWindow.webContents.focus()

    flowrWindow?.hide()

    browserWindow.on('close', () => {
      FullScreenManager.applySameWindowState(browserWindow, flowrWindow)
      browserWindow = null
      flowrWindow?.webContents.setAudioMuted(false)
      flowrWindow?.show()
    })

    return browserWindow
  }

  async function onReady() {
    await clearBrowsingData()
    const flowrStore = initFlowrStore()

    keyboard.flowrStore = flowrStore

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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

    ipcMain.on('flowr-desktop-config', (event: IpcMainEvent, desktopConfig?: { userPreferences: Partial<IFlowrStore>, player: Partial<IPlayerStore> }) => {
      const currentFlowrStore = cloneDeep(flowrStore.data)
      delete currentFlowrStore.player
      if (desktopConfig) {
        /**
         * Merge config from ozone over default one
         * For empty values (null or '') coming from ozone, use the default value
         * If customizer function returns undefined, merging is handled by the method instead
         */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        const userPreferencesMerged = mergeWith({}, DEFAULT_FRONTEND_STORE, currentFlowrStore, desktopConfig.userPreferences, (a, b) => b === null || b === '' ? a : undefined)
        flowrWindow.initStore(userPreferencesMerged, desktopConfig.player)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ipcMain.on('open-browser', async (event: Event, options: Omit<WexondOptions, 'enableVirtualKeyboard'>) => {
      await openBrowserWindow(flowrStore, event, options)
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
    })
  }

  if (app.isReady()) {
    void onReady()
  } else {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.on('ready', onReady)
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  ipcMain.on('clear-application-data', clearBrowsingData)

  app.on('window-all-closed', () => {
    applicationManager.destroy()
    app.quit()
  })

  async function initFlowr(store: Store<IFlowrStore>) {
    applicationManager.flowrStore = store

    try {
      flowrWindow = await createFlowrWindow(store)
      FullScreenManager.applyDefaultActionOnWindow(flowrWindow)
      applicationManager.flowrWindow = flowrWindow

      flowrWindow.on('close', () => {
        flowrWindow = null
      })

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      flowrWindow.webContents.on('new-window', async (event, url) => {
        event.preventDefault()

        await openBrowserWindow(store, event, {
          clearBrowsingDataAtClose: false,
          openUrl: url,
          maxTab : 0,
        })
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

void main()
