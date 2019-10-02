import { BarcoKeyBoardControllerInterface } from './barcoKeyBoardController.interface'

class BarcoKeyBoardController implements BarcoKeyBoardControllerInterface {
  async open(): Promise<void> {
    await fetch('http://localhost:9000/keyboard/open', { method: 'GET', mode: 'no-cors' })
  }
  async close(): Promise<void> {
    await fetch('http://localhost:9000/keyboard/close', { method: 'GET', mode: 'no-cors' })
  }
  async toggle(): Promise<void> {
    await fetch('http://localhost:9000/keyboard/toggle', { method: 'GET', mode: 'no-cors' })
  }
}

export const barcoKeyBoardController = new BarcoKeyBoardController()
