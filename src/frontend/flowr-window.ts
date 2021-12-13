import { BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'
import { Store } from './src/store'
import { Player } from './src/players/player'
import { KeyboardMixin } from '../keyboard/keyboardMixin'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { FullScreenManager } from '../common/fullscreen'
import {getLogger, setLevel} from './src/logging/loggers'
import {ILogger, LogSeverity} from './src/logging/types'
import { IPlayer } from './src/players/abstractPlayer'
import { IPlayerStore, PipelineType } from './src/interfaces/playerStore'
import { VlcPlayer } from './src/players/vlc/player'

function toRatioHeight(width: number, height: number) {
  return (value: number) => Math.floor((value - width) * height / width)
}

function toRatioWidth(width: number, height: number) {
  return (value: number) => Math.floor((value + width) * width / height)
}

const targetResolution = 16/9

export class FlowrWindow extends KeyboardMixin(BrowserWindow) {
  private resizeTimeout?: number
  public player?: IPlayer
  public logger?: ILogger

  get phoneServerUrl(): string | undefined {
    return this.store.get('phoneServer')
  }

  constructor(private store: Store<IFlowrStore>, options?: BrowserWindowConstructorOptions) {
    super(options)
    this.logger = getLogger('Flowr-windows')

    this.on('unmaximize', () => {
      const width = this.store.get('windowBounds').width
      const height = toRatioHeight(16, 9)(width)
      this.setSize(width, height + 40)
    })

    this.on('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        if (!this.isMaximized() && !FullScreenManager.isFullScreen(this)) {
          const mainScreen = screen.getPrimaryDisplay()
          this.logger.warn(`MainScreen: ${mainScreen.size.width} x ${mainScreen.size.height}`)
          const { width: mainWidth, height: mainHeight } = mainScreen.size
          const mainResolution = mainWidth/mainHeight
          const [flowrWidth, flowrHeigth] = this.getSize()
          this.logger.warn(`FlowrSize: ${flowrWidth} x ${flowrHeigth}`)
          let [width, height] = [flowrWidth, flowrHeigth]
          if (mainResolution >= targetResolution) { // respect the max height of screen
            width = toRatioWidth(16, 9)(flowrHeigth)
          } else { // respect the max width of screen
            height = toRatioHeight(16, 9)(flowrWidth)
          }
          this.setSize(width <= mainWidth ? width: mainWidth, height<= mainHeight ? height: mainHeight)
          store.set('windowBounds', { width, height })
        }
      }, 150)
    })
  }

  initStore(desktopConfig: IFlowrStore, playerConfig: Partial<IPlayerStore>): void {
    this.store.bulkSet(desktopConfig)
    setLevel(desktopConfig.logLevel ?? LogSeverity.INFO)

    if (!this.player) {
      const player = playerConfig.pipeline.use === PipelineType.VLC
        ? new VlcPlayer(this, playerConfig)
        : new Player(playerConfig)
      this.on('close', () => void player.close())
      this.player = player
    }
  }
}
