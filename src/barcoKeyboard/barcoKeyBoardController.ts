import { BrowserWindow } from 'electron'
import { KeyboardWindow } from '../applications/keyboard/keyboardWindow'
import { IFlowrStore } from '../frontend/src/interfaces/flowrStore'
import { Store } from '../frontend/src/store'

class Keyboard {
  flowrStore?: Store<IFlowrStore>
  keyboardWindow?: KeyboardWindow

  get isEnabled(): boolean {
    return this.flowrStore?.get('enableVirtualKeyboard') ?? false
  }

  private createKeyboard(parent: BrowserWindow): KeyboardWindow {
    const keyboardWindow = new KeyboardWindow(parent)
    keyboardWindow.on('close', () => this.keyboardWindow = undefined)
    return keyboardWindow
  }

  open(parent: BrowserWindow) {
    if (!this.isEnabled) {
      throw Error('Keyboard is not enabled.')
    }
    if (this.keyboardWindow) {
      this.keyboardWindow.setParentWindow(parent)
    } else {
      this.keyboardWindow = this.createKeyboard(parent)
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
    if (!this.keyboardWindow) {
      this.open(parent)
    } else {
      this.keyboardWindow.setParentWindow(parent)
      if (this.keyboardWindow.isVisible()) {
        this.keyboardWindow.hide()
      } else {
        this.keyboardWindow.show()
      }
    }
  }
}

export const keyboard = new Keyboard()
