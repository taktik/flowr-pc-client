import { BrowserWindow, app, ipcMain, globalShortcut, screen, BrowserWindowConstructorOptions } from 'electron'
import { resolve, join } from 'path'
import { platform } from 'os'
import { windowManager, Window } from 'node-window-manager'
import mouseEvents from 'mouse-hooks'

import { ViewManager } from './view-manager'
import { ProcessWindow } from './models/process-window'
import { TOOLBAR_HEIGHT } from '../renderer/app/constants'
import { KeyboardMixin } from '../../keyboard/keyboardMixin'
import { watchForInactivity } from '../../inactivity/window'
import { buildPreloadPath } from '../../common/preload'

const containsPoint = (bounds: any, point: any) => {
  return (
    point.x >= bounds.x &&
    point.y >= bounds.y &&
    point.x <= bounds.x + bounds.width &&
    point.y <= bounds.y + bounds.height
  )
}
export interface WexondOptions {
  clearBrowsingDataAtClose: boolean,
  openUrl: string
  maxTab : number
  enableVirtualKeyboard: boolean
  closeAfterInactivity?: boolean
  inactivityTimeout?: number
}
export class AppWindow extends KeyboardMixin(BrowserWindow) {
  public viewManager: ViewManager

  public windows: ProcessWindow[] = []
  public selectedWindow: ProcessWindow

  public window: Window
  public draggedWindow: ProcessWindow

  public draggedIn = false
  public detached = false
  public isMoving = false
  public isUpdatingContentBounds = false
  public willAttachWindow = false
  public isWindowHidden = false

  public interval: number | null = null

  constructor(options: WexondOptions, parent?: BrowserWindow, defaultBrowserWindow: BrowserWindowConstructorOptions = {}) {
    super({
      ...defaultBrowserWindow,
      frame: process.env.ENV === 'dev' || platform() === 'darwin',
      show: false,
      parent,
      fullscreen: false,
      webPreferences: {
        plugins: true,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true, // TODO: FLOW-8215
        experimentalFeatures: true,
        preload: buildPreloadPath('inactivity-preload.js'),
      },
      icon: resolve(app.getAppPath(), 'static/app-icons/icon-wexond.png'),
    })

    const resize = () => {
      this.viewManager.fixBounds()
      this.webContents.send('tabs-resize')
    }

    this.on('maximize', resize)
    this.on('restore', resize)
    this.on('unmaximize', resize)

    let urlString: string
    if (process.env.ENV === 'dev') {
      this.webContents.openDevTools({ mode: 'detach' })
      urlString = 'http://localhost:4444/app.html'
    } else {
      urlString = join('file://', app.getAppPath(), 'build/app.html')
    }
    const url = new URL(urlString)
    Object.entries(options).forEach(([key, value]) => {
      if (typeof value !== 'boolean' || value) {
        url.searchParams.set(key, value)
      }
    })
    this.loadURL(url.toString())

    this.once('ready-to-show', () => {
      this.show()
    })

    this.on('enter-full-screen', () => {
      this.webContents.send('fullscreen', true)
      this.viewManager.fixBounds()
    })

    this.on('leave-full-screen', () => {
      this.webContents.send('fullscreen', false)
      this.viewManager.fixBounds()
    })

    this.on('enter-html-full-screen', () => {
      this.viewManager.fullscreen = true
      this.webContents.send('html-fullscreen', true)
    })

    this.on('leave-html-full-screen', () => {
      this.viewManager.fullscreen = false
      this.webContents.send('html-fullscreen', false)
    })

    this.on('scroll-touch-begin', () => {
      this.webContents.send('scroll-touch-begin')
    })

    this.on('scroll-touch-end', () => {
      this.viewManager.selected?.webContents.send('scroll-touch-end')
      this.webContents.send('scroll-touch-end')
    })

    if (platform() === 'win32') {
      const ipcEvents = {
        'select-window': (e: any, id: number) => {
          this.selectWindow(this.windows.find(x => x.id === id))
        },
        'detach-window': (e: any, id: number) => {
          this.detachWindow(this.windows.find(x => x.id === id))
        },
        'hide-window': () => {
          if (this.selectedWindow) {
            this.selectedWindow.hide()
            this.isWindowHidden = true
          }
        },
        setDebugMode: (evt: any, debugMode: boolean) => {
          if (debugMode) {
            this.webContents.openDevTools({ mode: 'detach' })
          } else {
            this.webContents.closeDevTools()
          }
        },
      }
      this.activateWindowCapturing(ipcEvents)
    } else {
      const ipcEvents = {
        setDebugMode: (evt: any, debugMode: boolean) => {
          if (debugMode) {
            this.webContents.openDevTools({ mode: 'detach' })
          } else {
            this.webContents.closeDevTools()
          }
        },
      }
      this.on('close', () => {
        Object.entries(ipcEvents).forEach(event => ipcMain.removeListener(...event))
      })
      Object.entries(ipcEvents).forEach(event => ipcMain.on(...event))
    }

    if (options.closeAfterInactivity) {
      const timeout = options.inactivityTimeout ?? 5 // default to 5 minutes
      this.viewManager = new ViewManager({
        timeout,
        callback: () => {
          // Only close if inactivity occurs on "nested" views
          if (this.getBrowserView()) {
            this.close()
          }
        },
      })
      watchForInactivity(this, timeout, () => {
        // Only close if inactivity occurs on "main" view
        if (!this.getBrowserView()) {
          this.close()
        }
      })
    } else {
      this.viewManager = new ViewManager()
    }
  }

  public activateWindowCapturing(ipcEvents: {[key: string]: (...args: any[]) => void}) {
    const mouseEventsListeners = {
      'mouse-down': () => {
        if (this.isMinimized()) return
  
        setTimeout(() => {
          this.draggedWindow = new ProcessWindow(
            windowManager.getActiveWindow().id,
          )
  
          if (this.draggedWindow.id === handle) {
            this.draggedWindow = null
            return
          }
        }, 50)
      },
      'mouse-up': async () => {
        if (this.selectedWindow && !this.isMoving) {
          const bounds = this.selectedWindow.getBounds()
          const { lastBounds } = this.selectedWindow
  
          if (
            !this.isMaximized() &&
            (bounds.width !== lastBounds.width ||
              bounds.height !== lastBounds.height)
          ) {
            this.isUpdatingContentBounds = true
  
            clearInterval(this.interval)
  
            const sf = windowManager.getScaleFactor(this.window.getMonitor())
  
            this.selectedWindow.lastBounds = bounds
  
            this.setContentBounds({
              width: bounds.width,
              height: bounds.height + TOOLBAR_HEIGHT,
              x: bounds.x,
              y: bounds.y - TOOLBAR_HEIGHT - 1,
            })
  
            this.interval = setInterval(this.intervalCallback, 100)
  
            this.isUpdatingContentBounds = false
          }
        }
  
        this.isMoving = false
  
        if (this.draggedWindow && this.willAttachWindow) {
          const win = this.draggedWindow
  
          win.setOwner(this.window)
  
          this.windows.push(win)
  
          this.willAttachWindow = false
  
          setTimeout(() => {
            this.selectWindow(win)
          }, 50)
        }
  
        this.draggedWindow = null
        this.detached = false
      },
    }
    const updateBounds = () => {
      this.isMoving = true

      if (!this.isUpdatingContentBounds) {
        this.resizeWindow(this.selectedWindow)
      }
    }

    const handle = this.getNativeWindowHandle().readInt32LE(0)
    this.window = new Window(handle)

    this.on('move', updateBounds)
    this.on('resize', updateBounds)

    this.on('close', () => {
      Object.entries(ipcEvents).forEach(event => ipcMain.off(...event))
      Object.entries(mouseEventsListeners).forEach(([eventName, callback]) => mouseEvents.off(eventName, callback))
      for (const window of this.windows) {
        this.detachWindow(window)
      }

      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }

      windowManager.removeAllListeners('window-activated')
    })

    this.interval = setInterval(this.intervalCallback, 100)

    Object.entries(ipcEvents).forEach(event => ipcMain.on(...event))
    Object.entries(mouseEventsListeners).forEach(([eventName, callback]) => mouseEvents.on(eventName, callback))

    windowManager.on('window-activated', (window: Window) => {
      this.webContents.send('select-tab', window.id)

      if (
        window.id === handle ||
        (this.selectedWindow && window.id === this.selectedWindow.id)
      ) {
        if (!globalShortcut.isRegistered('CmdOrCtrl+Tab')) {
          globalShortcut.register('CmdOrCtrl+Tab', () => {
            this.webContents.send('next-tab')
          })
        }
      } else if (globalShortcut.isRegistered('CmdOrCtrl+Tab')) {
        globalShortcut.unregister('CmdOrCtrl+Tab')
      }
    })
  }

  intervalCallback = async () => {
    if (this.isMoving) return

    if (!this.isMinimized()) {
      for (const window of this.windows) {
        const title = window.getTitle()
        if (window.lastTitle !== title) {
          this.webContents.send('update-tab-title', {
            id: window.id,
            title,
          })
          window.lastTitle = title
        }

        if (!window.isWindow()) {
          this.detachWindow(window)
          this.webContents.send('remove-tab', window.id)
        }
      }

      if (this.selectedWindow) {
        const contentBounds = this.getContentArea()
        const bounds = this.selectedWindow.getBounds()
        const { lastBounds } = this.selectedWindow

        if (
          (contentBounds.x !== bounds.x || contentBounds.y !== bounds.y) &&
          (bounds.width === lastBounds.width &&
            bounds.height === lastBounds.height)
        ) {
          const window = this.selectedWindow
          this.detachWindow(window)
          this.detached = true
        }
      }
    }

    if (
      !this.isMinimized() &&
      this.draggedWindow &&
      this.draggedWindow.getOwner().id === 0 &&
      !this.windows.find(x => x.id === this.draggedWindow.id)
    ) {
      const winBounds = this.draggedWindow.getBounds()
      const { lastBounds } = this.draggedWindow
      const contentBounds = this.getContentArea()
      const cursor = screen.getCursorScreenPoint()

      cursor.y = winBounds.y

      contentBounds.y -= TOOLBAR_HEIGHT
      contentBounds.height = 2 * TOOLBAR_HEIGHT

      if (
        !this.detached &&
        containsPoint(contentBounds, cursor) &&
        (winBounds.x !== lastBounds.x || winBounds.y !== lastBounds.y)
      ) {
        if (!this.draggedIn) {
          const title = this.draggedWindow.getTitle()

          try {
            const icon = await app.getFileIcon(this.draggedWindow.path)
            this.draggedWindow.lastTitle = title

            this.webContents.send('add-tab', {
              id: this.draggedWindow.id,
              title,
              icon: icon.toPNG(),
            })

            this.draggedIn = true
            this.willAttachWindow = true
          } catch (e) {
            console.error(e)
          }
        }
      } else if (this.draggedIn && !this.detached) {
        this.webContents.send('remove-tab', this.draggedWindow.id)

        this.draggedIn = false
        this.willAttachWindow = false
      }
    }
  }

  getContentArea() {
    const bounds = this.getContentBounds()

    bounds.y += TOOLBAR_HEIGHT
    bounds.height -= TOOLBAR_HEIGHT

    return bounds
  }

  selectWindow(window: ProcessWindow) {
    if (!window) return

    if (this.selectedWindow) {
      if (
        window.id === this.selectedWindow.id &&
        !this.isWindowHidden
      ) {
        return
      }

      this.selectedWindow.hide()
    }

    window.show()

    this.selectedWindow = window
    this.isWindowHidden = false

    this.resizeWindow(window)
  }

  resizeWindow(window: ProcessWindow) {
    if (!window || this.isMinimized()) return

    const newBounds = this.getContentArea()

    window.setBounds(newBounds)
    window.lastBounds = newBounds

    const bounds = window.getBounds()

    if (bounds.width > newBounds.width || bounds.height > newBounds.height) {
      this.setContentSize(bounds.width, bounds.height + TOOLBAR_HEIGHT)
      this.setMinimumSize(bounds.width, bounds.height + TOOLBAR_HEIGHT)
    }
  }

  detachWindow(window: ProcessWindow) {
    if (!window) return

    if (this.selectedWindow === window) {
      this.selectedWindow = null
    }

    window.detach()

    this.windows = this.windows.filter(x => x.id !== window.id)
  }

  close() {
    this.viewManager.clear()
    super.close()
  }
}
