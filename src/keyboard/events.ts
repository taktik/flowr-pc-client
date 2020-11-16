export enum VirtualKeyboardEvent {
    OPEN = 'open-keyboard',
    CLOSE = 'close-keyboard',
    TOGGLE = 'toggle-keyboard',
}

export const KeyEvents: { [key: string]: string } = {
  BACK_SPACE: 'Backspace',
  TAB: String.fromCharCode(9),
  ENTER: String.fromCharCode(13), // https://github.com/electron/electron/issues/8977
  CAPS_LOCK: 'Capslock',
  SHIFT: 'Shift',
  SPACE: String.fromCharCode(32),
}

export enum SimpleKeyboardKeys {
  BACK_SPACE = '{bksp}',
  TAB = '{tab}',
  ENTER = '{enter}',
  CAPS_LOCK = '{lock}',
  SHIFT = '{shift}',
  SPACE = '{space}',
}
