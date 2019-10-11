import { BrowserWindow, Rectangle, ipcMain } from 'electron'
import { WindowModes } from './WindowModes'
import { RegisterProps, PhoneConfig } from './views/phone'
import { Store } from '../../frontend/src/store'

interface PhoneAppProps {
  phoneServer?: string
  registerProps?: RegisterProps
  lang?: string
  capabilities?: {[key: string]: boolean}
  config: PhoneConfig
}

function buildPositionFromParents(parentRectangle: Rectangle) {
  return {
    width: Math.round(.6 * parentRectangle.width),
    height: Math.round(.6 * parentRectangle.height),
    x: Math.round(parentRectangle.x + .2 * parentRectangle.width),
    y: Math.round(parentRectangle.y),
  }
}

export class PhoneWindow extends BrowserWindow {
  _mode: WindowModes | undefined
  _registerProps: RegisterProps | undefined
  private _capabilities: {[key: string]: boolean} | undefined
  private _lang: string | undefined
  private readonly _ipcEvents: {[key: string]: (...args: any[]) => void}

  get _widgetPosition(): Rectangle {
    const contentBounds = this.getParentWindow().getBounds()
    return buildPositionFromParents(contentBounds)
  }

  get mode(): WindowModes | undefined {
    return this._mode
  }

  set mode(value: WindowModes | undefined) {
    this._mode = value
    if (value === WindowModes.WIDGET) {
      this.setBounds(this._widgetPosition, true)
    } else {
      this.setBounds(this.getParentWindow().getBounds(), true)
    }
    this.webContents.send('window-mode-changed', value)
  }

  set registerProps(value: RegisterProps) {
    this.webContents.send('register-props', value)
    this._registerProps = value
  }

  get lang() {
    return this._lang
  }

  set lang(lang: string) {
    this.webContents.send('change-language', lang)
    this._lang = lang
  }

  get capabilities() {
    return this._capabilities
  }

  set capabilities(capabilities: {[key: string]: boolean}) {
    this.webContents.send('capabilities-changed', capabilities)
    this._capabilities = capabilities
  }

  set config(config: {[key: string]: any}) {
    this.webContents.send('config-changed', config)
  }

  constructor(parent: BrowserWindow, preload: string | undefined, index: string, props: PhoneAppProps, private store?: Store | undefined) {
    super(Object.assign({
      frame: false,
      transparent: true,
      show: false,
      parent,
      backgroundColor: '#8C777777',
      webPreferences: {
        plugins: true,
        nodeIntegration: false,
        contextIsolation: false,
        experimentalFeatures: true,
        preload,
      },
    }, buildPositionFromParents(parent.getContentBounds())))
    const pageUrl = new URL(index)

    if (props.phoneServer) {
      pageUrl.searchParams.append('server', props.phoneServer)
    }

    if (props.registerProps) {
      pageUrl.searchParams.append('username', props.registerProps.username)
      pageUrl.searchParams.append('host', props.registerProps.host)
    }

    if (props.lang) {
      pageUrl.searchParams.append('lang', props.lang)
    }

    if (props.capabilities) {
      pageUrl.searchParams.append('capabilities', encodeURIComponent(JSON.stringify(props.capabilities)))
    }

    if (props.config) {
      pageUrl.searchParams.append('config', encodeURIComponent(JSON.stringify(props.config)))
    }

    this.loadURL(pageUrl.href)

    this.mode = WindowModes.WIDGET
    this._ipcEvents = {
      'phone-maximize': () => this.mode = WindowModes.FULLSCREEN,
      'phone-reduce': () => this.mode = WindowModes.WIDGET,
      'phone-show': this.show.bind(this),
      'phone-hide': this.hide.bind(this),
      'register-props': this.updateRegisterProps.bind(this),
      'phone-mute': this.mute.bind(this),
      setDebugMode: (evt: any, debugMode: boolean) => {
        if (debugMode) {
          this.webContents.openDevTools()
        } else {
          this.webContents.closeDevTools()
        }
      },
      'update-phone-store': this.updateStore.bind(this),
    }

    Object.entries(this._ipcEvents).forEach(event => ipcMain.on(...event))
    this.on('close', () => Object.entries(this._ipcEvents).forEach(event => ipcMain.removeListener(...event)))
  }

  updateRegisterProps(e: Event, registerProps: RegisterProps) {
    console.log('Received register props', registerProps)
    this.registerProps = registerProps
  }

  open(mode: WindowModes = WindowModes.WIDGET) {
    this.mode = mode
    this.show()
  }

  mute(e: Event, mute: boolean) {
    this.webContents.setAudioMuted(mute)
    this.webContents.send('mute-changed', this.webContents.isAudioMuted())
  }

  updateStore(e: Event, data: {[key: string]: any} = {}) {
    if (this.store) {
      if (Object.keys(data).length) {
        this.store.bulkSet(data)
      }
      this.webContents.send('store-updated', this.store.data)
    } else {
      console.warn('No available store to save data')
    }
  }
}
