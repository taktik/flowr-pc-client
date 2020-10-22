import { BrowserWindow } from 'electron'
import { KeyboardWindow } from '../applications/keyboard/keyboardWindow'

class Keyboard {
  keyboardWindow?: KeyboardWindow

  private createKeyboard(parent: BrowserWindow): KeyboardWindow {
    const keyboardWindow = new KeyboardWindow(parent)
    keyboardWindow.on('close', () => this.keyboardWindow = undefined)
    return keyboardWindow
  }

  open(parent: BrowserWindow) {
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
