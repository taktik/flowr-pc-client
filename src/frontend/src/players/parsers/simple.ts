import { IStreamerConfig } from '../../interfaces/ipcStreamerConfig'
import { getLogger } from '../../logging/loggers'
import FfmpegParser from './abstract'

class SimpleParser extends FfmpegParser {
  protected log = getLogger('simple parser')
  private sendInterval: NodeJS.Timer | undefined
  private sendIntervalValue: number

  constructor(config: IStreamerConfig) {
    super(config)

    this.sendIntervalValue = config.sendInterval
  }

  /**
   * Start sending data at a specific time interval
   */
  protected postBufferProcess(): void {
    if (!this.sendInterval) {
      this.sendInterval = setInterval(this.attemptSend.bind(this), this.sendIntervalValue)
    }
  }

  clear(flush: boolean): void {
    clearInterval(this.sendInterval)
    this.sendInterval = undefined
    super.clear(flush)
  }
}

export default SimpleParser
