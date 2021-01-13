import { ipcMain, session } from 'electron'
import { TOOLBAR_HEIGHT } from '~/renderer/app/constants/design'
import { appWindow } from '.'
import { View } from './view'
import { clearBrowsingData } from '~/main/clearBrowsingData'
import { watchForInactivity } from '../../inactivity/window'
import { IInactivityConfig } from '../../inactivity/utils'

declare const global: any

global.viewsMap = {}

export class ViewManager {
  public views: { [key: number]: View } = {}
  public selectedId = 0
  public _fullscreen = false

  public isHidden = false

  public get fullscreen() {
    return this._fullscreen
  }

  public set fullscreen(val: boolean) {
    this._fullscreen = val
    this.fixBounds()
  }

  private readonly _ipcEvents: {[key: string]: (...args: any[]) => void}

  constructor(private inactivityConfig?: IInactivityConfig) {
    this._ipcEvents = {
      'browserview-create': (e: Electron.IpcMessageEvent, { tabId, url }: any) => {
        this.create(tabId, url)

        appWindow.webContents.send(
          `browserview-created-${tabId}`,
          this.views[tabId].id,
        )
      },
      'browserview-select': (e: Electron.IpcMessageEvent, id: number, force: boolean) => {
        const view = this.views[id]
        this.select(id)
        view.updateNavigationState()

        if (force) this.isHidden = false
      },
      'clear-browsing-data': clearBrowsingData,
      'browserview-destroy': (e: Electron.IpcMessageEvent, id: number) => {
        this.destroy(id)
      },
      'browserview-call': async (e: any, data: any) => {
        const view = this.views[data.tabId]
        if (!view) return
        let scope: any = view

        if (data.scope && data.scope.trim() !== '') {
          const scopes = data.scope.split('.')
          for (const s of scopes) {
            scope = scope[s]
          }
        }

        let result = scope.apply(view.webContents, data.args)

        if (result instanceof Promise) {
          result = await result
        }

        if (data.callId) {
          appWindow.webContents.send(
            `browserview-call-result-${data.callId}`,
            result,
          )
        }
      },
      'browserview-hide': () => this.hideView(),
      'browserview-show': () => this.showView(),
      'browserview-clear': () => this.clear(),
    }
    Object.entries(this._ipcEvents).forEach(event => ipcMain.on(event[0], event[1]))

    setInterval(() => {
      for (const key in this.views) {
        const view = this.views[key]
        const title = view.webContents.getTitle()
        const url = view.webContents.getURL()

        if (title !== view.title) {
          appWindow.webContents.send(`browserview-data-updated-${key}`, {
            title,
            url,
          })
          view.url = url
          view.title = title
        }
      }
    }, 200)

    session.fromPartition('persist:view').on('will-download', (event) => {
      event.preventDefault()
    })
  }

  public get selected() {
    return this.views[this.selectedId]
  }

  public create(tabId: number, url: string) {
    const view = new View(tabId, url)
    this.views[tabId] = view
    global.viewsMap[view.id] = tabId

    if (this.inactivityConfig) {
      const { timeout, callback } = this.inactivityConfig
      try {
        watchForInactivity(view, timeout, async (browserWindow) => {
          if (browserWindow.id === this.selectedId) {
            callback()
          }
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  public clear() {
    if (appWindow) {
      appWindow.setBrowserView(null)
    }
    for (const key in this.views) {
      this.destroy(parseInt(key, 10))
    }
    Object.entries(this._ipcEvents).forEach(event => ipcMain.removeListener(event[0], event[1]))
  }

  public select(tabId: number) {
    const view = this.views[tabId]
    this.selectedId = tabId

    if (!view || view.webContents.isDestroyed()) {
      this.destroy(tabId)
      appWindow.setBrowserView(null)
      return
    }

    if (this.isHidden) return

    appWindow.setBrowserView(view)

    const currUrl = view.webContents.getURL()

    if (
      (currUrl === '' && view.homeUrl === 'about:blank') ||
      currUrl === 'about:blank'
    ) {
      appWindow.webContents.focus()
    } else {
      view.webContents.focus()
    }

    this.fixBounds()
  }

  public fixBounds() {
    const view = this.views[this.selectedId]

    if (!view) return

    const { width, height } = appWindow.getContentBounds()
    view.setBounds({
      x: 0,
      y: this.fullscreen ? 0 : TOOLBAR_HEIGHT + 1,
      width,
      height: this.fullscreen ? height : height - TOOLBAR_HEIGHT,
    })
    view.setAutoResize({
      width: true,
      height: true,
    })
  }

  public hideView() {
    this.isHidden = true
    appWindow.setBrowserView(null)
  }

  public showView() {
    this.isHidden = false
    this.select(this.selectedId)
  }

  public destroy(tabId: number) {
    const view = this.views[tabId]

    if (!view || view.webContents?.isDestroyed()) {
      delete this.views[tabId]
      return
    }

    if (appWindow && appWindow.getBrowserView() === view) {
      appWindow.setBrowserView(null)
    }

    // Undocumented electron API: https://github.com/electron/electron/issues/26929#issuecomment-754294324
    (view.webContents as any).destroy()

    delete this.views[tabId]
  }

  sendToAll(name: string, ...args: any[]) {
    for (const key in this.views) {
      const view = this.views[key]
      view.webContents.send(name, ...args)
    }
  }
}
