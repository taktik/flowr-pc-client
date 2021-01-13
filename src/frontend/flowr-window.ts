import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { Store } from './src/store'
import { Player } from './src/player'
import { KeyboardMixin } from '../keyboard/keyboardMixin'
import { IFlowrStore } from './src/interfaces/flowrStore'

export class FlowrWindow extends KeyboardMixin(BrowserWindow) {

  private resizeTimeout?: number
  public player: Player

  get phoneServerUrl(): string | undefined {
    return this.store.get('phoneServer')
  }

  constructor(private store: Store<IFlowrStore>, options?: BrowserWindowConstructorOptions) {
    super(options)
    this.player = new Player(this.store)

    this.on('close', () => {
      this.player.close()
    })
    this.on('maximize',  () => {
      this.store.set('isMaximized', true)
    })

    this.on('unmaximize', () => {
      this.store.set('isMaximized', false)
      const width = this.store.get('windowBounds').width
      const height =  Math.floor((width - 16) * 9 / 16)

      this.setSize(width, height + 40)
    })

    this.on('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        if (!store.get('isMaximized')) {
          const size = this.getSize()
          const width = size[0]
          const height =  Math.floor((width - 16) * 9 / 16)
          this.setSize(width, height + 40)
          store.set('windowBounds', { width, height })
        }
      }, 150)
    })
  }

}
