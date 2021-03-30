import { BrowserWindow } from 'electron'
import { request } from 'http'
import { KeyboardWindow } from '../applications/keyboard/keyboardWindow'
import { IFlowrStore } from '../frontend/src/interfaces/flowrStore'
import { Store } from '../frontend/src/store'

class Keyboard {
  private _flowrStore?: Store<IFlowrStore>
  keyboardWindow?: KeyboardWindow

  set flowrStore(flowrStore: Store<IFlowrStore>) {
    this._flowrStore = flowrStore

    /**
     * Create the keyboard window early on
     * This is to circumvent an issue on Windows when creating this window later would put it behind every other window along with its parent
     * If the real source of this issue is found those lines can be deleted (to avoid creating a potentially unused window)
     */
    if (this.isEnabled && !this.isExternal) {
      this.createKeyboard()
    }
  }

  get isEnabled(): boolean {
    return !!this._flowrStore?.get('keyboardConfig').keyboard
  }

  get isExternal(): boolean {
    return this._flowrStore?.get('keyboardConfig').keyboard === 'external'
  }

  private get shouldCreateNewKeyboardWindow() {
    return !this.isExternal && (!this.keyboardWindow || this.keyboardWindow.isDestroyed())
  }

  private externalKeyboardRequest(endPoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const keyboardRequest = request(
        `${this._flowrStore?.get('keyboardConfig').externalKeyboardURL}/${endPoint}`,
        { method: 'GET' },
        (res) => {
          res.on('end', resolve)
        },
      )

      keyboardRequest.on('error', reject)
      keyboardRequest.end()
    })
  }

  createKeyboard(parent?: BrowserWindow): void {
    const keyboardWindow = new KeyboardWindow(parent)
    keyboardWindow.on('close', () => this.keyboardWindow = undefined)
    this.keyboardWindow =  keyboardWindow
  }

  open(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
    }
    if (this.isExternal) {
      this.externalKeyboardRequest('open')
        .catch(console.error)
      return
    }
    if (this.shouldCreateNewKeyboardWindow) {
      this.createKeyboard(parent)
    } else {
      this.setParentWindow(parent)
    }
    this.keyboardWindow.show()
  }

  close() {
    if (this.isExternal) {
      this.externalKeyboardRequest('close')
        .catch(console.error)
      return
    }
    this.keyboardWindow?.hide()
  }

  toggle(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
    }
    if (this.isExternal) {
      this.externalKeyboardRequest('toggle')
        .catch(console.error)
      return
    }
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

  setParentWindow(parent: BrowserWindow) {
    parent.on('close', () => {
      this.keyboardWindow?.setParentWindow(null)
      this.keyboardWindow.hide()
    })
    this.keyboardWindow.setParentWindow(parent)
  }
}

export const keyboard = new Keyboard()
