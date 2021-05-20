import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { Store } from './src/store'
// import { Player } from './src/player'
import { Player } from './src/playerNew'
import { KeyboardMixin } from '../keyboard/keyboardMixin'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { FullScreenManager } from '../common/fullscreen'

function toRatio(width: number, height: number) {
  return (value: number) => Math.floor((value - width) * height / width)
}

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

    this.on('unmaximize', () => {
      const width = this.store.get('windowBounds').width
      const height = toRatio(16, 9)(width)

      this.setSize(width, height + 40)
    })

    this.on('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        if (!this.isMaximized() && !FullScreenManager.isFullScreen(this)) {
          const size = this.getSize()
          const width = size[0]
          const height = toRatio(16, 9)(width)
          this.setSize(width, height + 40)
          store.set('windowBounds', { width, height })
        }
      }, 150)
    })
  }

}
