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
import { initializeLogging } from './src/logging'
import { LogSeverity } from './src/logging/types'
import * as deepExtend from 'deep-extend'
import { IFlowrConfig } from './src/interfaces/flowrConfig'
import { buildFileUrl } from '../application-manager/helpers'

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
  logLevel: LogSeverity.INFO,
}
export async function initFlowrConfig(data: IFlowrStore | null): Promise<void> {
  await initConfigData(join(FlowrDataDir, `${FRONTEND_CONFIG_NAME}.json`), data)
}
const DEVICE_DETAIL_PATH = join(FlowrDataDir, 'device.json')
const devicesDetailsHelper = new DeviceDetailHelper(DEVICE_DETAIL_PATH)

const RELOAD_INTERVAL = 120000 // 2min

let isDebugMode: boolean
let isHiddenMenuDisplayed = false
let isLaunchedUrlCorrect = true
let reloadTimeout: number | undefined
let lastError = ''

export function buildBrowserWindowConfig(flowrStore: Store<IFlowrStore>, options: BrowserWindowConstructorOptions): BrowserWindowConstructorOptions {
  return extend(options, defaultBrowserWindowOptions(flowrStore))
}

export async function createFlowrWindow(flowrStore: Store<IFlowrStore>): Promise<FlowrWindow> {
  const mac = await getActiveMacAddress()

  const defaultUrl = buildFileUrl('config.html')
  const kiosk = flowrStore.get('isKiosk') || false
  const storedUrl = flowrStore.get('extUrl')
  let firstUrl: URL
  try {
    firstUrl = new URL(storedUrl)
  } catch (e) {
    isLaunchedUrlCorrect = false
    console.error(`Invalid FlowR URL: ${storedUrl}. Display config page.`)
    firstUrl = new URL(defaultUrl)
  }
  // Create the browser window.
  const opts = buildBrowserWindowConfig(flowrStore, {
    icon: resolve(app.getAppPath(), 'static/app-icons/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      partition: 'persist:flowr', // needed to display webcam image
      preload: buildPreloadPath('exportNode.js'),
    },
  })

  const mainWindow = new FlowrWindow(flowrStore, opts)

  function loadConfigPage() {
    mainWindow.loadURL(defaultUrl)
      .catch(e => {
        console.error('Failed to load default configuration page.... sorry but can\'t do anything else for you', e)
      })
  }

  function loadFlowr(flowrURL: string): void {
    mainWindow.loadURL(flowrURL)
      .catch((e: Error & { code: string }) => {
        if (e.code === 'ERR_ABORTED') {
          // ignore => it means the page changed its hash in the meantime
          return
        }
        console.warn('Error loading flowr window', e)
        lastError = e.message
        loadConfigPage()
      }) 
  }

  if (kiosk) {
    // No menu is kiosk mode
    const emptyAppMenu = Menu.buildFromTemplate([])
    Menu.setApplicationMenu(emptyAppMenu)
  }

  // mainWindow.setAspectRatio(16/9)
  mainWindow.setMenuBarVisibility(false)
  // mainWindow.setAlwaysOnTop(true, 'floating', 0)

  // set mac address in the URL te ensure backward compatibility with Flowr 5.1
  firstUrl.searchParams.set('mac', mac)
  loadFlowr(firstUrl.href)
  reloadTimeout = setInterval(reload, RELOAD_INTERVAL)

  // Open the DevTools.
  if (process.env.ENV === 'dev') {
    mainWindow.webContents.openDevTools()
    isDebugMode = true
  }

  initializeLogging(mainWindow.webContents)

  function displayHiddenMenu(): void {
    const flowrUrl = flowrStore.get('extUrl') || defaultUrl
    const template: any = [
      {
        label: 'Menu',
        submenu: [
          {
            label: 'Config',
            click() {
              loadConfigPage()
              isHiddenMenuDisplayed = true
            },
          },
          {
            label: 'Flowr',
            click() {
              isHiddenMenuDisplayed = false
              loadFlowr(flowrUrl)
            },
          },
          {
            label: 'Hide Menu',
            click() {
              mainWindow.setMenuBarVisibility(false)
              if (isHiddenMenuDisplayed) {
                loadFlowr(flowrUrl)
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
    getAppConfig: (evt: IpcMainEvent) => {
      const storedConfig = flowrStore.get('flowrConfig')
      const config: any = {
        debugMode: isDebugMode,
        isLaunchedUrlCorrect,
        deinterlacing: flowrStore.get('deinterlacing'),
        extUrl: flowrStore.get('extUrl'),
        isKiosk: flowrStore.get('isKiosk'),
        clearAppDataOnStart: flowrStore.get('clearAppDataOnStart'),
        enableVirtualKeyboard: flowrStore.get('enableVirtualKeyboard'),
        lastError,
      }
      // no need to expose the complete config
      if (storedConfig?.ozoneApi) {
        const ozoneApi = storedConfig.ozoneApi.hostProxy || ''
        const flowrApi = (storedConfig.flowrApi?.hostProxy) || ''
        const socketApi = (storedConfig.socketApi?.host) || ''
        const pushVodSocketApi = (storedConfig.pushVodSocketApi?.host) || ''
        const aneviaVodSocketApi = (storedConfig.aneviaVodSocketApi?.host) || ''

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
    getMacAddress: async (evt: IpcMainEvent) => {
      const activeMacAddress = await getActiveMacAddress()
      evt.sender.send('receiveMacAddress', activeMacAddress)
    },
    getActiveMacAddress: async (evt: IpcMainEvent) => {
      const activeMacAddress = await getActiveMacAddress()
      evt.sender.send('receiveActiveMacAddress', activeMacAddress)
    },
    getAllMacAddresses: async (evt: IpcMainEvent) => {
      try {
        const allMacAddresses = await getAllMacAddresses()
        evt.sender.send('receiveAllMacAddresses', allMacAddresses)
      } catch (e) {
        evt.sender.send('receiveAllMacAddresses', [])
      }
    },
    getIpAddress: async (evt: IpcMainEvent) => {
      try {
        const ipAddress = await getIpAddress()
        evt.sender.send('receiveIpAddress', ipAddress)
      } catch (e) {
        evt.sender.send('receiveIpAddress', '127.0.0.1')
      }
    },
    updateAppConfig: (evt: IpcMainEvent, data: IFlowrConfig) => {
      const currentConfig = flowrStore.get('flowrConfig')
      const newConfig = deepExtend(currentConfig, data)
      flowrStore.set('flowrConfig', newConfig)
      app.relaunch()
      app.quit()
    },
    setDebugMode: (evt: IpcMainEvent, debugMode: boolean) => {
      isDebugMode = debugMode
      if (isDebugMode) {
        mainWindow.webContents.openDevTools()
      } else {
        mainWindow.webContents.closeDevTools()
      }
    },
    setDeinterlacingMode: (evt: IpcMainEvent, deinterlacingMode: any) => {
      flowrStore.set('deinterlacing', deinterlacingMode)
    },
    setClearAppDataOnStart: (evt: IpcMainEvent, clearAppDataOnStart: any) => {
      flowrStore.set('clearAppDataOnStart', clearAppDataOnStart)
    },
    setKioskMode: (evt: IpcMainEvent, isKiosk: boolean) => {
      flowrStore.set('isKiosk', isKiosk)
      app.relaunch()
      app.quit()
    },
    setExtUrl: (evt: IpcMainEvent, newExtURl: string) => {
      flowrStore.set('extUrl', newExtURl)
      app.relaunch()
      app.quit()
    },
    setEnableVirtualKeyboard: (evt: IpcMainEvent, enableVirtualKeyboard: boolean) => {
      flowrStore.set('enableVirtualKeyboard', enableVirtualKeyboard)
      app.relaunch()
      app.quit()
    },
    getClientMetadata: (evt: IpcMainEvent) => {
      evt.sender.send('receiveClientMetadata', {
        name: app.getName(),
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        platform: process.platform,
        arch: process.arch,
      })
    },
    captureScreen: async (evt: IpcMainEvent) => {
      const image = await mainWindow.capturePage()
      evt.sender.send('receiveScreenCapture', image.toDataURL())
    },
    openConfigMode: displayHiddenMenu,
  }
  Object.entries(_ipcEvents).forEach(event => ipcMain.on(...event))
  mainWindow.on('close', () => Object.entries(_ipcEvents).forEach(event => ipcMain.removeListener(...event)))

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
