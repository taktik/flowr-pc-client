import Keyboard from 'simple-keyboard'
import frenchLayout from 'simple-keyboard-layouts/build/layouts/french'
import 'simple-keyboard/build/css/index.css'
import './style.css'
import { KeyEvents, SimpleKeyboardKeys } from '../../../keyboard/events'

const simpleToElectronKeys: {[key: string]: string} = {
  [SimpleKeyboardKeys.BACK_SPACE]: KeyEvents.BACK_SPACE,
  [SimpleKeyboardKeys.TAB]: KeyEvents.TAB,
  [SimpleKeyboardKeys.ENTER]: KeyEvents.ENTER,
  [SimpleKeyboardKeys.CAPS_LOCK]: KeyEvents.CAPS_LOCK,
  [SimpleKeyboardKeys.SHIFT]: KeyEvents.SHIFT,
  [SimpleKeyboardKeys.SPACE]: KeyEvents.SPACE,
}

enum KeyboardState {
  DEFAULT = 'DEFAULT',
  SHIFT = 'SHIFT',
  CAPS_LOCK = 'CAPS_LOCK',
}

enum Layout {
  DEFAULT = 'default',
  SHIFT = 'shift',
}

const eventsToFilterOut: string[] = [
  SimpleKeyboardKeys.CAPS_LOCK,
  SimpleKeyboardKeys.SHIFT,
]

export class KeyboardView {
  private state = KeyboardState.DEFAULT
  private keyboard = new Keyboard({
    onKeyPress: this.onKeyPress.bind(this) as KeyboardView['onKeyPress'],
    onKeyReleased: this.onKeyUp.bind(this) as KeyboardView['onKeyUp'],
    ...frenchLayout,
  })

  private formatKeyCode(keyCode: string): string {
    return simpleToElectronKeys[keyCode] ?? keyCode
  }

  private getThemeForState(state: KeyboardState): { class: string, buttons: string }[] {
    switch (state) {
      case KeyboardState.SHIFT:
        return [{
          class: 'hg-highlight',
          buttons: SimpleKeyboardKeys.SHIFT,
        }]
      case KeyboardState.CAPS_LOCK:
        return [{
          class: 'hg-highlight',
          buttons: SimpleKeyboardKeys.CAPS_LOCK,
        }]
      default:
        return []
    }
  }

  private setState(state: KeyboardState): void {
    this.state = state

    const layoutName = [KeyboardState.SHIFT, KeyboardState.CAPS_LOCK].includes(this.state)
      ? Layout.SHIFT
      : Layout.DEFAULT
    const buttonTheme = this.getThemeForState(this.state)
    this.keyboard.setOptions({ layoutName, buttonTheme })
  }

  private findState(keyCode: string): KeyboardState | void {
    switch (keyCode) {
      case SimpleKeyboardKeys.SHIFT:
        switch (this.state) {
          case KeyboardState.SHIFT:
            return KeyboardState.DEFAULT
          default:
            return KeyboardState.SHIFT
        }
      case SimpleKeyboardKeys.CAPS_LOCK:
        switch (this.state) {
          case KeyboardState.CAPS_LOCK:
            return KeyboardState.DEFAULT
          default:
            return KeyboardState.CAPS_LOCK
        }
      default:
        if (this.state === KeyboardState.SHIFT) {
          return KeyboardState.DEFAULT
        }
    }
  }

  private isToSend(keyCode: string): boolean {
    return !eventsToFilterOut.includes(keyCode)
  }

  private sendEvent(eventName: 'keyPress' | 'keyUp', keyCode: string): void {
    if (this.isToSend(keyCode)) {
      ipc.send(eventName, this.formatKeyCode(keyCode))
    }
  }

  private onKeyPress(keyCode: string): void {
    this.sendEvent('keyPress', keyCode)
  }

  private onKeyUp(keyCode: string): void {
    this.sendEvent('keyUp', keyCode)

    const stateToGo = this.findState(keyCode)
    if (stateToGo) {
      this.setState(stateToGo)
    }
  }
}

window.addEventListener('resize', () => {
  const { width, height } = document.body.getBoundingClientRect()
  ipc.send('resize', { width, height })
})

// tslint:disable-next-line: no-unused-expression
new KeyboardView()
