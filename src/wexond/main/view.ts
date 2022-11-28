import {
  BrowserView,
  Menu,
  nativeImage,
  clipboard,
  WebContents,
  BrowserWindowConstructorOptions,
} from 'electron'
import { appWindow } from '.'
import { engine } from './services/web-request'
import { settings } from './index'
import { parse } from 'tldts'
import { buildPreloadPath } from '../../common/preload'
import { getUserAgentForURL } from './user-agent'
import { WEXOND_PARTITION } from '../../common/partitions'

export class View {
  public browserView: BrowserView
  public tabId: number
  public homeUrl: string

  constructor(id: number, viewUrl: string) {
    this.browserView = new BrowserView({
      webPreferences: {
        preload: buildPreloadPath('view-preload.js'),
        nodeIntegration: false,
        additionalArguments: [`--tab-id=${id}`],
        contextIsolation: true,
        partition: WEXOND_PARTITION,
        plugins: true,
      },
    })

    this.webContents.userAgent = getUserAgentForURL(
      this.webContents.userAgent,
      '',
    )

    this.homeUrl = viewUrl
    this.tabId = id

    this.webContents.on('context-menu', (e, params) => {
      let menuItems: Electron.MenuItemConstructorOptions[] = []

      if (params.linkURL !== '') {
        menuItems = menuItems.concat([
          {
            label: 'Open link in new tab',
            click: () => {
              appWindow.webContents.send(
                'api-tabs-create',
                {
                  url: params.linkURL,
                  active: false,
                },
                true,
              )
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Copy link address',
            click: () => {
              clipboard.clear()
              clipboard.writeText(params.linkURL)
            },
          },
          {
            type: 'separator',
          },
        ])
      }

      if (params.hasImageContents) {
        menuItems = menuItems.concat([
          {
            label: 'Open image in new tab',
            click: () => {
              appWindow.webContents.send(
                'api-tabs-create',
                {
                  url: params.srcURL,
                  active: false,
                },
                true,
              )
            },
          },
          {
            label: 'Copy image',
            click: () => {
              const img = nativeImage.createFromDataURL(params.srcURL)

              clipboard.clear()
              clipboard.writeImage(img)
            },
          },
          {
            label: 'Copy image address',
            click: () => {
              clipboard.clear()
              clipboard.writeText(params.srcURL)
            },
          },
          {
            type: 'separator',
          },
        ])
      }

      if (params.isEditable) {
        menuItems = menuItems.concat([
          {
            role: 'undo',
          },
          {
            role: 'redo',
          },
          {
            type: 'separator',
          },
          {
            role: 'cut',
          },
          {
            role: 'copy',
          },
          {
            role: 'pasteAndMatchStyle',
          },
          {
            role: 'paste',
          },
          {
            role: 'selectAll',
          },
          {
            type: 'separator',
          },
        ] as any)
      }

      if (!params.isEditable && params.selectionText !== '') {
        menuItems = menuItems.concat([
          {
            role: 'copy',
          },
        ])
      }

      if (
        !params.hasImageContents &&
        params.linkURL === '' &&
        params.selectionText === '' &&
        !params.isEditable
      ) {
        menuItems = menuItems.concat([
          {
            label: 'Go back',
            enabled: this.webContents.canGoBack(),
            click: () => {
              this.webContents.goBack()
            },
          },
          {
            label: 'Go forward',
            enabled: this.webContents.canGoForward(),
            click: () => {
              this.webContents.goForward()
            },
          },
          {
            label: 'Refresh',
            click: () => {
              this.webContents.reload()
            },
          },
          {
            label: 'Close',
            click: () => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.webContents.executeJavaScript('document.exitFullscreen()')
              appWindow.webContents.send('remove-tab', this.tabId)
            },
          },
          {
            type: 'separator',
          },
        ])
      }

      const menu = Menu.buildFromTemplate(menuItems)

      menu.popup()
    })

    this.webContents.addListener('found-in-page', (e, result) => {
      appWindow.webContents.send('found-in-page', result)
    })

    this.webContents.addListener('did-stop-loading', () => {
      this.updateNavigationState()
      appWindow.webContents.send(`view-loading-${this.tabId}`, false)
    })

    this.webContents.addListener('did-start-loading', () => {
      this.updateNavigationState()
      appWindow.webContents.send(`view-loading-${this.tabId}`, true)
    })

    this.webContents.addListener('did-start-navigation', (e: any, _: string, isInPlace: boolean, isMainFrame: boolean) => {
      this.updateNavigationState()

      const url = this.webContents.getURL()

      // Adblocker cosmetic filtering
      if (settings.isShieldToggled) {
        const { styles, scripts } = engine.getCosmeticsFilters({
          url,
          ...parse(url),
        })

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.webContents.insertCSS(styles)

        for (const script of scripts) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.webContents.executeJavaScript(script)
        }
      }

      appWindow.webContents.send(`load-commit-${this.tabId}`, isMainFrame)

      this.emitWebNavigationEvent('onBeforeNavigate', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        parentFrameId: -1,
      })

      this.emitWebNavigationEvent('onCommitted', {
        tabId: this.tabId,
        url,
        sourceFrameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        frameId: 0,
        parentFrameId: -1,
      })
    })

    this.webContents.addListener(
      'did-start-navigation',
      (e, url, isInPlace, isMainFrame) => {
        if (!isMainFrame) return
        const newUA = getUserAgentForURL(this.webContents.userAgent, url)
        if (this.webContents.userAgent !== newUA) {
          this.webContents.userAgent = newUA
        }
      }
    )

    this.webContents.addListener('did-finish-load', () => {
      this.emitWebNavigationEvent('onCompleted', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
      })
    })

    this.webContents.setWindowOpenHandler(({ disposition, frameName, url }) => {
      let action: 'allow' | 'deny' = 'allow'

      if (disposition === 'new-window') {
        if (frameName === '_self') {
          action = 'deny'
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          appWindow.viewManager.selected.webContents.loadURL(url)
        } else if (frameName === '_blank') {
          action = 'deny'
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.webContents.executeJavaScript('document.exitFullscreen()')
          appWindow.webContents.send(
            'api-tabs-create',
            {
              url,
              active: true,
            },
            true,
          )
        }
      } else if (disposition === 'foreground-tab') {
        action = 'deny'
        appWindow.webContents.send(
          'api-tabs-create',
          { url, active: true },
          true,
        )
      } else if (disposition === 'background-tab') {
        action = 'deny'
        appWindow.webContents.send(
          'api-tabs-create',
          { url, active: false },
          true,
        )
      }

      this.emitWebNavigationEvent('onCreatedNavigationTarget', {
        tabId: this.tabId,
        url,
        sourceFrameId: 0,
        timeStamp: Date.now(),
      })

      const overrideBrowserWindowOptions: BrowserWindowConstructorOptions = action === 'allow'
        ? { parent: appWindow, autoHideMenuBar: true }
        : {}
      return { action, overrideBrowserWindowOptions }
    })

    this.webContents.addListener('dom-ready', () => {
      this.emitWebNavigationEvent('onDOMContentLoaded', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
      })
    })

    this.webContents.addListener(
      'page-favicon-updated',
      (e, favicons) => {
        appWindow.webContents.send(
          `browserview-favicon-updated-${this.tabId}`,
          favicons[0],
        )
      },
    )

    this.webContents.addListener('did-change-theme-color', (e, color) => {
      appWindow.webContents.send(
        `browserview-theme-color-updated-${this.tabId}`,
        color,
      )
    });

    this.webContents.addListener(
      'certificate-error',
      (
        event: Electron.Event,
        _: string,
        _2: string,
        _3: Electron.Certificate,
        callback: (response: boolean) => unknown,
      ) => {
        // TODO: properly handle insecure websites.
        event.preventDefault()
        callback(true)
      },
    )

    this.webContents.addListener('did-navigate', (e, url) => {
      this.updateURL(url)
    })

    this.webContents.addListener('did-navigate-in-page', (e, url) => {
      this.updateURL(url)
    })

    this.webContents.addListener('page-title-updated', (e, title) => {
      appWindow.webContents.send(
        `view-title-updated-${this.tabId}`,
        title,
      )
    })

    this.browserView.setAutoResize({
      width: true,
      height: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.webContents.loadURL(viewUrl)
  }

  public get webContents(): WebContents {
    return this.browserView.webContents
  }

  public get url(): string {
    return this.webContents.getURL()
  }

  public get title(): string {
    return this.webContents.getTitle()
  }

  public get id(): number {
    return this.webContents.id
  }

  public get isSelected(): boolean {
    return this.id === appWindow.viewManager.selectedId
  }

  public updateNavigationState = (): void => {
    if (!this.webContents || this.webContents.isDestroyed()) return

    if (appWindow.viewManager.selectedId === this.tabId) {
      appWindow.webContents.send('update-navigation-state', {
        canGoBack: this.webContents.canGoBack(),
        canGoForward: this.webContents.canGoForward(),
      })
    }
  }

  public emitWebNavigationEvent = (name: string, ...data: any[]): void => {
    this.webContents.send(`api-emit-event-webNavigation-${name}`, ...data)
  }

  public getScreenshot = async (): Promise<string> => {
    const img = await this.webContents.capturePage()
    return img.toDataURL()
  }

  public updateURL = (url: string): void => {
    appWindow.webContents.send(
      `view-url-updated-${this.tabId}`,
      url,
    )
  }
}
