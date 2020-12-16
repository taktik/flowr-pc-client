import { app, BrowserWindow } from 'electron'
import { KeyboardWindow } from '../applications/keyboard/keyboardWindow'
import { IFlowrStore } from '../frontend/src/interfaces/flowrStore'
import { Store } from '../frontend/src/store'

class Keyboard {
  flowrStore?: Store<IFlowrStore>
  keyboardWindow?: KeyboardWindow

  get isEnabled(): boolean {
    return !!this.flowrStore?.get('enableVirtualKeyboard')
  }

  private get shouldCreateNewKeyboardWindow() {
    return !this.keyboardWindow || this.keyboardWindow.isDestroyed()
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
    if (this.shouldCreateNewKeyboardWindow) {
      this.createKeyboard(parent)
    } else {
      this.setParentWindow(parent)
    }
    this.keyboardWindow.show()
  }

  close() {
    this.keyboardWindow?.hide()
  }

  toggle(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
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

/**
 * Create the keyboard window early on
 * This is to circumvent an issue on Windows when creating this window later would put it behind every other window along with its parent
 * If the real source of this issue is found those lines can be deleted (to avoid creating a potentially unused window)
 */
if (app.isReady()) {
  keyboard.createKeyboard()
} else {
  app.once('ready', () => keyboard.createKeyboard())
}
