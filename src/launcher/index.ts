import { ipcMain, app, BrowserWindow } from 'electron'
import { resolve } from 'path'
import { homedir } from 'os'
import { remove } from 'fs-extra'
import { autoUpdater } from 'electron-updater'
import { createFlowrWindow, initFlowrConfig, buildBrowserWindowConfig, FRONTEND_CONFIG_NAME, DEFAULT_FRONTEND_STORE } from '../frontend'
import { createWexondWindow, setWexondLog } from '~/main'
import { getMigrateUserPreferences } from './migration/fromFlowrClientToFlowrPcClient'
import { FlowrWindow } from 'src/frontend/flowr-window'
export const log = require('electron-log')
import { StoreManager, Store } from '../frontend/src/store'
import { ApplicationManager } from '../application-manager/application-manager'
const FlowrDataDir = resolve(homedir(), '.flowr')

export const storeManager = new StoreManager(FlowrDataDir)
const applicationManager = new ApplicationManager()

const migrateUserPreferences = getMigrateUserPreferences(`${FRONTEND_CONFIG_NAME}.json`)
if (migrateUserPreferences) {
  initFlowrConfig(migrateUserPreferences)
}

app.commandLine.appendSwitch('widevine-cdm-path', resolve('/Applications/Google Chrome.app/Contents/Versions/74.0.3729.169/Google Chrome Framework.framework/Versions/A/Libraries/WidevineCdm/_platform_specific/mac_x64'))
// The version of plugin can be got from `chrome://components` page in Chrome.
app.commandLine.appendSwitch('widevine-cdm-version', '4.10.1303.2')

app.setPath('userData', resolve(homedir(), '.flowr-electron'))
log.transports.file.level = 'verbose'
log.transports.file.file = resolve(app.getPath('userData'), 'log.log')
setWexondLog(log)
ipcMain.setMaxListeners(0)

let flowrWindow: FlowrWindow | null = null
let flowrStore: Store | null = null

let wexondWindow: BrowserWindow | null = null

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

app.on('ready', async () => {

  app.on('activate', async () => {
    if (flowrWindow === null) {
      await initFlowr()
    }
  })
  await initFlowr()

  autoUpdater.on('update-downloaded', ({ version }) => {
    // TODO
    if (flowrWindow) {
      flowrWindow.webContents.send('update-available', version)
    }
  })

  ipcMain.on('update-install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.on('update-check', () => {
    if (process.env.ENV !== 'dev') {
      autoUpdater.checkForUpdates()
    }
  })

  ipcMain.on('window-focus', () => {
    if (flowrWindow) {
      flowrWindow.webContents.focus()
    }
  })

  ipcMain.on('open-browser', (event: Event, options: any) => {
    if (wexondWindow === null) {
      flowrStore = flowrStore || initFlowrStore()
      wexondWindow = createWexondWindow(options, flowrWindow || undefined, buildBrowserWindowConfig(flowrStore, {}))
      applicationManager.wexondWindow = wexondWindow
      wexondWindow.on('close', () => {
        wexondWindow = null
      })
    } else {
      // wexondWindow.moveTop()
      wexondWindow.webContents.send('open-tab', options)
    }
    wexondWindow.webContents.focus()
  })
  ipcMain.on('close-browser', () => {
    if (wexondWindow !== null) {
      wexondWindow.close()
    }
  })
  ipcMain.on('open-flowr', () => {
    if (wexondWindow !== null) {
      wexondWindow.close()
    }
    // flowrWindow.moveTop()
  })
})

ipcMain.on('clear-application-data', async () => {
  await remove(app.getPath('userData'))
  app.relaunch()
  app.exit()
})

app.on('window-all-closed', () => {
  applicationManager.destroy()
  app.quit()
})

async function initFlowr() {
  try {
    await applicationManager.initLocalApps()
  } catch (e) {
    console.error('Failed to initialize apps', e)
  }

  try {
    flowrStore = flowrStore || initFlowrStore()
    flowrWindow = await createFlowrWindow(flowrStore)
    applicationManager.flowrWindow = flowrWindow
    flowrWindow.on('close', () => {
      flowrWindow = null
    })
    ipcMain.on('flowrLanguageChanged', (e: Event, lang: string) => applicationManager.languageChanged(lang))
  } catch (e) {
    console.error('Error in init', e)
  }
}

function initFlowrStore(): Store {
  return storeManager.createStore(FRONTEND_CONFIG_NAME, DEFAULT_FRONTEND_STORE)
}
