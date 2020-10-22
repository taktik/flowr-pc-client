import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

const simpleToElectronKeys: {[key: string]: string} = {
  '{bksp}': 'Backspace',
  '{tab}': 'Tab',
  '{enter}': String.fromCharCode(13), // https://github.com/electron/electron/issues/8977
  '{lock}': 'Capslock',
  '{shift}': 'Shift',
  '{space}': 'Space',
}

export class KeyboardView {
  constructor() {
    // tslint:disable-next-line: no-unused-expression
    new Keyboard({
      onKeyPress: this.onKeyPress('keyPress'),
      onKeyReleased: this.onKeyPress('keyUp'),
    })
  }

  onKeyPress(eventName: 'keyPress' | 'keyUp') {
    return (keyCode: string) => {
      const remapped = simpleToElectronKeys[keyCode] ?? keyCode
      window.ipcRenderer.send(eventName, remapped)
    }
  }
}

// tslint:disable-next-line: no-unused-expression
new KeyboardView()
