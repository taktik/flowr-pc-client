import { BrowserWindow } from 'electron'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { KeyboardWindow } from '../applications/keyboard/keyboardWindow'
import { IFlowrStore, VirtualKeyboardConfig, VirtualKeyboardMode } from '../frontend/src/interfaces/flowrStore'
import { getLogger } from '../frontend/src/logging/loggers'
import { Store } from '../frontend/src/store'

const log = getLogger('Keyboard controller')

class Keyboard {
  private _flowrStore?: Store<IFlowrStore>
  private parentCloseCallback?: { parent: BrowserWindow, callback: () => void }
  keyboardWindow?: KeyboardWindow

  set flowrStore(flowrStore: Store<IFlowrStore>) {
    this._flowrStore = flowrStore

    /**
     * Create the keyboard window early on
     * This is to circumvent an issue on Windows when creating this window later would put it behind every other window along with its parent
     * If the real source of this issue is found those lines can be deleted (to avoid creating a potentially unused window)
     */
    if (this.isEnabled) {
      this.createKeyboard()
    }
  }

  get isEnabled(): boolean {
    return !!this._flowrStore?.get('enableVirtualKeyboard')
  }

  get config(): VirtualKeyboardConfig | undefined {
    return this._flowrStore?.get('virtualKeyboardConfig')
  }

  private get shouldCreateNewKeyboardWindow() {
    return !this.keyboardWindow || this.keyboardWindow.isDestroyed()
  }

  private callExternal(url: string, method = 'GET') {
    try {
      const handler = url.startsWith('https') ? httpsRequest : httpRequest
      const request = handler(url, { method })
      request.end()
    } catch (error) {
      log.warn('An error occurred when calling external keyboard endpoint', url, error)
    }
  }

  createKeyboard(parent?: BrowserWindow): void {
    const keyboardWindow = new KeyboardWindow(parent)
    keyboardWindow.on('close', () => this.keyboardWindow = undefined)
    this.keyboardWindow =  keyboardWindow
  }

  openInternal(parent: BrowserWindow) {
    if (this.shouldCreateNewKeyboardWindow) {
      this.createKeyboard(parent)
    } else {
      this.setParentWindow(parent)
    }
    this.keyboardWindow.show()
  }

  open(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
    }

    const { method, mode, urls } = this.config ?? {}

    if (mode === VirtualKeyboardMode.EXTERNAL && urls) {
      this.callExternal(urls.open, method)
    } else {
      this.openInternal(parent)
    }
  }

  closeInternal() {
    this.keyboardWindow?.hide()
  }

  close() {
    const { method, mode, urls } = this.config ?? {}

    if (mode === VirtualKeyboardMode.EXTERNAL && urls) {
      this.callExternal(urls.close, method)
    } else {
      this.closeInternal()
    }
  }

  toggleInternal(parent: BrowserWindow) {
    if (this.shouldCreateNewKeyboardWindow) {
      this.open(parent)
    } else {
      this.setParentWindow(parent)
      if (this.keyboardWindow.isVisible()) {
        this.keyboardWindow.hide()
      } else {
        this.keyboardWindow.show()
      }
    }
  }

  toggle(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
    }
    const { method, mode, urls } = this.config ?? {}

    if (mode === VirtualKeyboardMode.EXTERNAL && urls) {
      this.callExternal(urls.toggle, method)
    } else {
      this.toggleInternal(parent)
    }
  }

  setParentWindow(parent: BrowserWindow) {
    if (this.parentCloseCallback && this.parentCloseCallback.parent !== parent) {
      const callback = () => {
        this.keyboardWindow?.setParentWindow(null)
        this.keyboardWindow?.hide()
      }

      this.parentCloseCallback.parent.off('close', this.parentCloseCallback.callback)
      parent.on('close', callback)
      this.parentCloseCallback = { parent, callback }
    }
    this.keyboardWindow?.setParentWindow(parent)
  }
}

export const keyboard = new Keyboard()
