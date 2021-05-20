import { resolve, join } from 'path'
import { homedir } from 'os'
import { ipcMain, Menu, app, BrowserWindowConstructorOptions, IpcMainEvent } from 'electron'
import { initConfigData, Store } from './src/store'
import { DeviceDetailHelper } from './src/deviceDetail'
import { FlowrWindow } from './flowr-window'
import { extend } from 'lodash'
import { URL } from 'url'
import { networkEverywhere } from 'network-everywhere'
import defaultBrowserWindowOptions from './defaultBrowserWindowOptions'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { buildPreloadPath } from '../common/preload'
import { FullScreenManager } from '../common/fullscreen'

const deepExtend = require('deep-extend')
const FlowrDataDir = resolve(homedir(), '.flowr')

export const FRONTEND_CONFIG_NAME = 'user-preferences'
export const DEFAULT_FRONTEND_STORE: IFlowrStore = {
  // 800x600 is the default size of our window
  windowBounds: { width: 1280, height: 720 },
  channelData: {},
  isMaximized: false,
  clearAppDataOnStart: false,
  extUrl: '',
  isKiosk: false,
  deinterlacing: false,
  enableVirtualKeyboard: false,
}
export async function initFlowrConfig(data: object) {
  await initConfigData(join(FlowrDataDir, `${FRONTEND_CONFIG_NAME}.json`), data)
}
const DEVICE_DETAIL_PATH = join(FlowrDataDir, 'device.json')
const devicesDetailsHelper = new DeviceDetailHelper(DEVICE_DETAIL_PATH)

const RELOAD_INTERVAL = 120000 // 2min

let isDebugMode: boolean
let isHiddenMenuDisplayed = false
let isLaunchedUrlCorrect = true
let reloadTimeout: number | undefined

export function buildBrowserWindowConfig(flowrStore: Store<IFlowrStore>, options: BrowserWindowConstructorOptions): BrowserWindowConstructorOptions {
  return extend(options, defaultBrowserWindowOptions(flowrStore))
}

export async function createFlowrWindow(flowrStore: Store<IFlowrStore>): Promise<FlowrWindow> {
  const mac = await getActiveMacAddress()

  const defaultUrl = buildFileUrl('config.html')
  const kiosk = flowrStore.get('isKiosk') || false
  const flowrUrl = flowrStore.get('extUrl')
  let url: URL
  try {
    url = new URL(flowrUrl)
  } catch (e) {
    isLaunchedUrlCorrect = false
    console.error(`Invalid FlowR URL: ${flowrUrl}. Display config page.`)
    url = new URL(defaultUrl)
  }
  // Create the browser window.
  const opts = buildBrowserWindowConfig(flowrStore, {
    icon: resolve(app.getAppPath(), 'static/app-icons/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      partition: 'persist:flowr', // needed to display webcam image
      preload: buildPreloadPath('exportNode.js'),
      enableRemoteModule: true, // TODO: FLOW-8215
    },
  })

  const mainWindow = new FlowrWindow(flowrStore, opts)

  if (kiosk) {
    // No menu is kiosk mode
    const appMenu = Menu.buildFromTemplate([])
    Menu.setApplicationMenu(appMenu)
  }

  // mainWindow.setAspectRatio(16/9)
  mainWindow.setMenuBarVisibility(false)
  // mainWindow.setAlwaysOnTop(true, 'floating', 0)

  // set mac address in the URL te ensure backward compatibility with Flowr 5.1
  url.searchParams.set('mac', mac)
  mainWindow.loadURL(url.href)
  reloadTimeout = setInterval(reload, RELOAD_INTERVAL)

  // Open the DevTools.
  if (process.env.ENV === 'dev') {
    mainWindow.webContents.openDevTools()
    isDebugMode = true
  }

  function displayHiddenMenu(): void {
    const flowrUrl = flowrStore.get('extUrl') || buildFileUrl('config.html')
    const template: any = [
      {
        label: 'Menu',
        submenu: [
          {
            label: 'Config',
            click() {
              const formattedPath = buildFileUrl('config.html')
              mainWindow.loadURL(formattedPath)
              isHiddenMenuDisplayed = true
            },
          },
          {
            label: 'Flowr',
            click() {
              isHiddenMenuDisplayed = false
              mainWindow.loadURL(flowrUrl)
            },
          },
          {
            label: 'Hide Menu',
            click() {
              mainWindow.setMenuBarVisibility(false)
              if (isHiddenMenuDisplayed) {
                mainWindow.loadURL(flowrUrl)
              }
            },
          },
          {
            label: 'Toggle Fullscreen Mode',
            click() {
              const windowIsFullscreen = FullScreenManager.isFullScreen(mainWindow)
              FullScreenManager.setFullScreen(mainWindow, !windowIsFullscreen)
            },
          },
        ],
      },
    ]

    const appMenu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(appMenu)
    mainWindow.setMenuBarVisibility(true)
  }

  const _ipcEvents: { [key: string]: (...args: any[]) => void } = {
    FlowrIsInitializing: () => {
      clearInterval(reloadTimeout)
      isLaunchedUrlCorrect = true
    },
    getAppConfig: (evt: any) => {
      const storedConfig = flowrStore.get('flowrConfig')
      const config: any = {
        debugMode: isDebugMode,
        isLaunchedUrlCorrect,
        deinterlacing: flowrStore.get('deinterlacing'),
        extUrl: flowrStore.get('extUrl'),
        isKiosk: flowrStore.get('isKiosk'),
        clearAppDataOnStart: flowrStore.get('clearAppDataOnStart'),
        enableVirtualKeyboard: flowrStore.get('enableVirtualKeyboard'),
      }
      // no need to expose the complete config
      if (storedConfig && storedConfig.ozoneApi) {
        const ozoneApi = storedConfig.ozoneApi.hostProxy || ''
        const flowrApi = (storedConfig.flowrApi && storedConfig.flowrApi.hostProxy) || ''
        const socketApi = (storedConfig.socketApi && storedConfig.socketApi.host) || ''
        const pushVodSocketApi = (storedConfig.pushVodSocketApi && storedConfig.pushVodSocketApi.host) || ''
        const aneviaVodSocketApi = (storedConfig.aneviaVodSocketApi && storedConfig.aneviaVodSocketApi.host) || ''

        config.appConfig = {
          ozoneApi: {
            hostProxy: ozoneApi,
          },
          flowrApi: {
            hostProxy: flowrApi,
          },
          socketApi: {
            host: socketApi,
          },
          pushVodSocketApi: {
            host: pushVodSocketApi,
          },
          aneviaVodSocketApi: {
            host: aneviaVodSocketApi,
          },
        }
      }

      evt.sender.send('receiveConfig', config)
    },
    getMacAddress: async (evt: any) => {
      const activeMacAddress = await getActiveMacAddress()
      evt.sender.send('receiveMacAddress', activeMacAddress)
    },
    getActiveMacAddress: async (evt: any) => {
      const activeMacAddress = await getActiveMacAddress()
      evt.sender.send('receiveActiveMacAddress', activeMacAddress)
    },
    getAllMacAddresses: async (evt: any) => {
      try {
        const allMacAddresses = await getAllMacAddresses()
        evt.sender.send('receiveAllMacAddresses', allMacAddresses)
      } catch (e) {
        evt.sender.send('receiveAllMacAddresses', [])
      }
    },
    getIpAddress: async (evt: any) => {
      try {
        const ipAddress = await getIpAddress()
        evt.sender.send('receiveIpAddress', ipAddress)
      } catch (e) {
        evt.sender.send('receiveIpAddress', '127.0.0.1')
      }
    },
    updateAppConfig: (evt: any, data: any) => {
      const currentConfig = flowrStore.get('flowrConfig')
      const newConfig = deepExtend(currentConfig, data)
      flowrStore.set('flowrConfig', newConfig)
      app.relaunch()
      app.quit()
    },
    setDebugMode: (evt: any, debugMode: boolean) => {
      isDebugMode = debugMode
      if (isDebugMode) {
        mainWindow.webContents.openDevTools()
      } else {
        mainWindow.webContents.closeDevTools()
      }
    },
    setDeinterlacingMode: (evt: any, deinterlacingMode: any) => {
      flowrStore.set('deinterlacing', deinterlacingMode)
    },
    setClearAppDataOnStart: (evt: any, clearAppDataOnStart: any) => {
      flowrStore.set('clearAppDataOnStart', clearAppDataOnStart)
    },
    setKioskMode: (evt: any, isKiosk: boolean) => {
      flowrStore.set('isKiosk', isKiosk)
      app.relaunch()
      app.quit()
    },
    setExtUrl: (evt: any, newExtURl: string) => {
      flowrStore.set('extUrl', newExtURl)
      app.relaunch()
      app.quit()
    },
    setEnableVirtualKeyboard: (evt: IpcMainEvent, enableVirtualKeyboard: boolean) => {
      flowrStore.set('enableVirtualKeyboard', enableVirtualKeyboard)
      app.relaunch()
      app.quit()
    },
    openConfigMode: displayHiddenMenu,
  }
  Object.entries(_ipcEvents).forEach(event => ipcMain.on(...event))
  mainWindow.on('close', () => Object.entries(_ipcEvents).forEach(event => ipcMain.removeListener(...event)))

  function buildFileUrl(fileName: string): string {
    let result: string
    if (process.env.ENV === 'dev') {
      result = `http://localhost:4444/${fileName}`
    } else {
      result = join('file://', app.getAppPath(), 'build', fileName)
    }
    return result
  }

  async function getActiveMacAddress(): Promise<string> {
    if (flowrStore.get('useRealMacAddress')) {
      return (await networkEverywhere.getActiveInterface()).mac
    }
    return (await devicesDetailsHelper.getDeviceDetails()).uuid
  }

  async function getAllMacAddresses(): Promise<string[]> {
    const activeMac = await getActiveMacAddress()
    const allMac = await networkEverywhere.getAllMacAddresses()
    return [activeMac, ...allMac]
  }

  function getIpAddress(): Promise<string> {
    return networkEverywhere.getIpAddress()
  }

  function reload() {
    if (mainWindow) {
      mainWindow.reload()
    }
  }

  return mainWindow
}
