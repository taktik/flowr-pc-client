import {
  BrowserView,
  app,
  Menu,
  nativeImage,
  clipboard,
  BrowserWindow,
  BrowserViewConstructorOptions,
} from 'electron'
import { appWindow } from '.'
import { sendToAllExtensions } from './extensions'
import { engine } from './services/web-request'
import { settings } from './index'
import { parse } from 'tldts'

function BrowserWindowExtend(electronClass: BrowserWindow) {
  return class implements BrowserWindow {
    private _browserWindow: BrowserWindow

    constructor(options: BrowserViewConstructorOptions) {
      this._browserWindow = new BrowserWindow(options)
      this.on = this._browserWindow.on.bind(this._browserWindow)
      this.once = this._browserWindow.once.bind(this._browserWindow)
      this.removeListener = this._browserWindow.removeListener.bind(this._browserWindow)

      Object.keys(this._browserWindow).forEach((key: keyof BrowserWindow) => {
        (this as any)[key] = this._browserWindow[key]
      })
    }
    on: (...args: any[]) => any
    once: (...args: any[]) => any
    addListener: (...args: any[]) => any
    removeListener: (...args: any[]) => any
    addBrowserView(browserView: BrowserView): void
    addTabbedWindow(browserWindow: BrowserWindow): void
    blur(): void
    blurWebView(): void
    capturePage(rect?: Electron.Rectangle): Promise<Electron.NativeImage>
    center(): void
    close(): void
    closeFilePreview(): void
    destroy(): void
    flashFrame(flag: boolean): void
    focus(): void
    focusOnWebView(): void
    getBackgroundColor(): string
    getBounds(): Electron.Rectangle
    getBrowserView(): BrowserView
    getBrowserViews(): BrowserView[]
    getChildWindows(): BrowserWindow[]
    getContentBounds(): Electron.Rectangle
    getContentSize(): number[]
    getMaximumSize(): number[]
    getMediaSourceId(): string
    getMinimumSize(): number[]
    getNativeWindowHandle(): Buffer
    getNormalBounds(): Electron.Rectangle
    getOpacity(): number
    getParentWindow(): BrowserWindow
    getPosition(): number[]
    getRepresentedFilename(): string
    getSize(): number[]
    getTitle(): string
    getTrafficLightPosition(): Electron.Point
    hasShadow(): boolean
    hide(): void
    hookWindowMessage(message: number, callback: () => void): void
    isAlwaysOnTop(): boolean
    isClosable(): boolean
    isDestroyed(): boolean
    isDocumentEdited(): boolean
    isEnabled(): boolean
    isFocused(): boolean
    isFullScreen(): boolean
    isFullScreenable(): boolean
    isKiosk(): boolean
    isMaximizable(): boolean
    isMaximized(): boolean
    isMenuBarAutoHide(): boolean
    isMenuBarVisible(): boolean
    isMinimizable(): boolean
    isMinimized(): boolean
    isModal(): boolean
    isMovable(): boolean
    isNormal(): boolean
    isResizable(): boolean
    isSimpleFullScreen(): boolean
    isVisible(): boolean
    isVisibleOnAllWorkspaces(): boolean
    isWindowMessageHooked(message: number): boolean
    loadFile(filePath: string, options?: Electron.LoadFileOptions): Promise<void>
    loadURL(url: string, options?: Electron.LoadURLOptions): Promise<void>
    maximize(): void
    mergeAllWindows(): void
    minimize(): void
    moveAbove(mediaSourceId: string): void
    moveTabToNewWindow(): void
    moveTop(): void
    previewFile(path: string, displayName?: string): void
    reload(): void
    removeBrowserView(browserView: BrowserView): void
    removeMenu(): void
    restore(): void
    selectNextTab(): void
    selectPreviousTab(): void
    setAlwaysOnTop(flag: boolean, level?: 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel' | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver', relativeLevel?: number): void
    setAppDetails(options: Electron.AppDetailsOptions): void
    setAspectRatio(aspectRatio: number, extraSize?: Electron.Size): void
    setAutoHideCursor(autoHide: boolean): void
    setAutoHideMenuBar(hide: boolean): void
    setBackgroundColor(backgroundColor: string): void
    setBounds(bounds: Partial<Electron.Rectangle>, animate?: boolean): void
    setBrowserView(browserView: BrowserView): void
    setClosable(closable: boolean): void
    setContentBounds(bounds: Electron.Rectangle, animate?: boolean): void
    setContentProtection(enable: boolean): void
    setContentSize(width: number, height: number, animate?: boolean): void
    setDocumentEdited(edited: boolean): void
    setEnabled(enable: boolean): void
    setFocusable(focusable: boolean): void
    setFullScreen(flag: boolean): void
    setFullScreenable(fullscreenable: boolean): void
    setHasShadow(hasShadow: boolean): void
    setIcon(icon: string | Electron.NativeImage): void
    setIgnoreMouseEvents(ignore: boolean, options?: Electron.IgnoreMouseEventsOptions): void
    setKiosk(flag: boolean): void
    setMaximizable(maximizable: boolean): void
    setMaximumSize(width: number, height: number): void
    setMenu(menu: Menu): void
    setMenuBarVisibility(visible: boolean): void
    setMinimizable(minimizable: boolean): void
    setMinimumSize(width: number, height: number): void
    setMovable(movable: boolean): void
    setOpacity(opacity: number): void
    setOverlayIcon(overlay: Electron.NativeImage, description: string): void
    setParentWindow(parent: BrowserWindow): void
    setPosition(x: number, y: number, animate?: boolean): void
    setProgressBar(progress: number, options?: Electron.ProgressBarOptions): void
    setRepresentedFilename(filename: string): void
    setResizable(resizable: boolean): void
    setShape(rects: Electron.Rectangle[]): void
    setSheetOffset(offsetY: number, offsetX?: number): void
    setSimpleFullScreen(flag: boolean): void
    setSize(width: number, height: number, animate?: boolean): void
    setSkipTaskbar(skip: boolean): void
    setThumbarButtons(buttons: Electron.ThumbarButton[]): boolean
    setThumbnailClip(region: Electron.Rectangle): void
    setThumbnailToolTip(toolTip: string): void
    setTitle(title: string): void
    setTouchBar(touchBar: Electron.TouchBar): void
    setTrafficLightPosition(position: Electron.Point): void
    setVibrancy(type: 'appearance-based' | 'light' | 'dark' | 'titlebar' | 'selection' | 'menu' | 'popover' | 'sidebar' | 'medium-light' | 'ultra-dark' | 'header' | 'sheet' | 'window' | 'hud' | 'fullscreen-ui' | 'tooltip' | 'content' | 'under-window' | 'under-page'): void
    setVisibleOnAllWorkspaces(visible: boolean, options?: Electron.VisibleOnAllWorkspacesOptions): void
    setWindowButtonVisibility(visible: boolean): void
    show(): void
    showDefinitionForSelection(): void
    showInactive(): void
    toggleTabBar(): void
    unhookAllWindowMessages(): void
    unhookWindowMessage(message: number): void
    unmaximize(): void
    accessibleTitle: string
    autoHideMenuBar: boolean
    closable: boolean
    documentEdited: boolean
    excludedFromShownWindowsMenu: boolean
    fullScreen: boolean
    fullScreenable: boolean
    id: number
    kiosk: boolean
    maximizable: boolean
    menuBarVisible: boolean
    minimizable: boolean
    movable: boolean
    representedFilename: string
    resizable: boolean
    shadow: boolean
    simpleFullScreen: boolean
    title: string
    visibleOnAllWorkspaces: boolean
    webContents: Electron.WebContents
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this
    off(event: string | symbol, listener: (...args: any[]) => void): this
    removeAllListeners(event?: string | symbol): this
    setMaxListeners(n: number): this
    getMaxListeners(): number
    listeners(event: string | symbol): Function[]
    rawListeners(event: string | symbol): Function[]
    emit(event: string | symbol, ...args: any[]): boolean
    eventNames(): (string | symbol)[]
    listenerCount(type: string | symbol): number
  }
}

export class View extends BrowserView {
  public title: string = '';
  public url: string = '';
  public tabId: number;
  public homeUrl: string;

  constructor(id: number, url: string) {
    super({
      webPreferences: {
        preload: `${app.getAppPath()}/view-preload.js`,
        nodeIntegration: false,
        additionalArguments: [`--tab-id=${id}`],
        contextIsolation: true,
        partition: 'persist:view',
        plugins: true,
      },
    });

    this.homeUrl = url;
    this.tabId = id;

    this.webContents.on('context-menu', (e, params) => {
      let menuItems: Electron.MenuItemConstructorOptions[] = [];

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
              );
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Copy link address',
            click: () => {
              clipboard.clear();
              clipboard.writeText(params.linkURL);
            },
          },
          {
            type: 'separator',
          },
        ]);
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
              );
            },
          },
          {
            label: 'Copy image',
            click: () => {
              const img = nativeImage.createFromDataURL(params.srcURL);

              clipboard.clear();
              clipboard.writeImage(img);
            },
          },
          {
            label: 'Copy image address',
            click: () => {
              clipboard.clear();
              clipboard.writeText(params.srcURL);
            },
          },
          {
            type: 'separator',
          },
        ]);
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
        ] as any);
      }

      if (!params.isEditable && params.selectionText !== '') {
        menuItems = menuItems.concat([
          {
            role: 'copy',
          },
        ]);
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
              this.webContents.goBack();
            },
          },
          {
            label: 'Go forward',
            enabled: this.webContents.canGoForward(),
            click: () => {
              this.webContents.goForward();
            },
          },
          {
            label: 'Refresh',
            click: () => {
              this.webContents.reload();
            },
          },
          {
            label: 'Close',
            click: () => {
              this.webContents.executeJavaScript('document.exitFullscreen()');
              appWindow.webContents.send('remove-tab', this.tabId);
            },
          },
          {
            type: 'separator',
          },
        ]);
      }

      menuItems.push({
        label: 'Inspect Element',
        click: () => {
          this.webContents.inspectElement(params.x, params.y);

          if (this.webContents.isDevToolsOpened()) {
            this.webContents.devToolsWebContents.focus();
          }
        },
      });

      const menu = Menu.buildFromTemplate(menuItems);

      menu.popup();
    });

    this.webContents.addListener('found-in-page', (e, result) => {
      appWindow.webContents.send('found-in-page', result);
    });

    this.webContents.addListener('did-stop-loading', () => {
      this.updateNavigationState();
      appWindow.webContents.send(`view-loading-${this.tabId}`, false);
    });

    this.webContents.addListener('did-start-loading', () => {
      this.updateNavigationState();
      appWindow.webContents.send(`view-loading-${this.tabId}`, true);
    });

    this.webContents.addListener('did-start-navigation', (...args: any[]) => {
      this.updateNavigationState();

      const url = this.webContents.getURL();

      // Adblocker cosmetic filtering
      if (settings.isShieldToggled) {
        const { styles, scripts } = engine.getCosmeticsFilters({
          url,
          ...parse(url),
        });

        this.webContents.insertCSS(styles);

        for (const script of scripts) {
          this.webContents.executeJavaScript(script);
        }
      }

      appWindow.webContents.send(`load-commit-${this.tabId}`, ...args);

      this.emitWebNavigationEvent('onBeforeNavigate', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        parentFrameId: -1,
      });

      this.emitWebNavigationEvent('onCommitted', {
        tabId: this.tabId,
        url,
        sourceFrameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        frameId: 0,
        parentFrameId: -1,
      });
    });

    this.webContents.addListener('did-finish-load', async () => {
      this.emitWebNavigationEvent('onCompleted', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
      });
    });

    this.webContents.addListener(
      'new-window',
      (e, url, frameName, disposition) => {
        if (disposition === 'new-window') {
          if (frameName === '_self') {
            e.preventDefault();
            appWindow.viewManager.selected.webContents.loadURL(url);
          } else if (frameName === '_blank') {
            e.preventDefault();
            this.webContents.executeJavaScript('document.exitFullscreen()');
            appWindow.webContents.send(
              'api-tabs-create',
              {
                url,
                active: true,
              },
              true,
            );
          }
        } else if (disposition === 'foreground-tab') {
          e.preventDefault();
          appWindow.webContents.send(
            'api-tabs-create',
            { url, active: true },
            true,
          );
        } else if (disposition === 'background-tab') {
          e.preventDefault();
          appWindow.webContents.send(
            'api-tabs-create',
            { url, active: false },
            true,
          );
        }

        this.emitWebNavigationEvent('onCreatedNavigationTarget', {
          tabId: this.tabId,
          url,
          sourceFrameId: 0,
          timeStamp: Date.now(),
        });
      },
    );

    this.webContents.addListener('dom-ready', () => {
      this.emitWebNavigationEvent('onDOMContentLoaded', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
      });
    });

    this.webContents.addListener(
      'page-favicon-updated',
      async (e, favicons) => {
        appWindow.webContents.send(
          `browserview-favicon-updated-${this.tabId}`,
          favicons[0],
        );
      },
    );

    this.webContents.addListener('did-change-theme-color', (e, color) => {
      appWindow.webContents.send(
        `browserview-theme-color-updated-${this.tabId}`,
        color,
      );
    });

    (this.webContents as any).addListener(
      'certificate-error',
      (
        event: Electron.Event,
        url: string,
        error: string,
        certificate: Electron.Certificate,
        callback: Function,
      ) => {
        console.log(certificate, error, url);
        // TODO: properly handle insecure websites.
        event.preventDefault();
        callback(true);
      },
    );

    this.setAutoResize({
      width: true,
      height: true,
    });
    this.webContents.loadURL(url);
  }

  public updateNavigationState() {
    if (this.isDestroyed()) return;

    if (appWindow.viewManager.selectedId === this.tabId) {
      appWindow.webContents.send('update-navigation-state', {
        canGoBack: this.webContents.canGoBack(),
        canGoForward: this.webContents.canGoForward(),
      });
    }
  }

  public emitWebNavigationEvent = (name: string, ...data: any[]) => {
    this.webContents.send(`api-emit-event-webNavigation-${name}`, ...data);

    sendToAllExtensions(`api-emit-event-webNavigation-${name}`, ...data);
  };

  public async getScreenshot(): Promise<string> {
    return new Promise(resolve => {
      this.webContents.capturePage(img => {
        resolve(img.toDataURL());
      });
    });
  }
}
