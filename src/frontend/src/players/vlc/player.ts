import { ChildProcess, spawn } from 'child_process'
import { IpcMainEvent } from 'electron'
import { IPlayerStore } from '../../interfaces/playerStore'
import { AbstractPlayer, PlayProps, SubtitlesProps } from '../abstractPlayer'
import { IMessage, MessageDataType, MessageType, ProcessMessaging } from './messaging'

type ResizeProps = {
  width: number
	height: number
	x: number
	y: number
}

export class VlcPlayer extends AbstractPlayer {
  private process?: ChildProcess
  private messaging?: ProcessMessaging

  constructor(playerConfig: IPlayerStore) {
    super(playerConfig)
    this.onClose = this.onClose.bind(this)
    this.onError = this.onError.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.resize = this.resize.bind(this)

    this.registerEvent('resize', this.resize)

    try {
      const process = spawn(playerConfig.pipeline.metadata.applicationPath)
      process.on('close', this.onClose)
      process.on('error', this.onError)
      this.messaging = new ProcessMessaging(process)
      this.messaging.addListener(this.onMessage)
      this.process = process
    } catch (e) {
      this.log.error('Failed to initialize VLC application', e)
    }
  }

  private clear(process: ChildProcess) {
    if (process.exitCode === null) {
      // Process is still running
      process.kill()
    }
    this.process = undefined
    process.off('close', this.onClose)
    process.off('error', this.onError)
  }

  private onClose(code: number) {
    if (this.process) {
      this.log.info('Process closed with code', code)
      this.clear(this.process)
    }
  }

  private onError(e: Error) {
    if (this.process) {
      this.log.error('Error in VLC application', e)
      this.clear(this.process)
    }
  }

  private onMessage(message: IMessage) {
    this.log.info('RECEIVED MESSAGE FROM VLC', message)
  }

  sendVlcCommand(type: MessageDataType, value?: string) {
    if (this.messaging) {
      this.messaging.send(MessageType.VLC, { type, value })
    } else {
      const error = Error('Impossible to send message to VLC app, messaging system not available')
      this.log.warn(error)
    }
  }

  stop() {
    this.sendVlcCommand(MessageDataType.STOP)
  }

  play(_: IpcMainEvent, { url }: PlayProps) {
    this.sendVlcCommand(MessageDataType.PLAY, url)
  }

  setAudioTrack(_: IpcMainEvent, pid: number) {
    this.sendVlcCommand(MessageDataType.SET_AUDIO, pid.toString())
  }

  setSubtitles(_: IpcMainEvent, { subtitlesPid }: SubtitlesProps) {
    this.sendVlcCommand(MessageDataType.SET_SUBTITLES, subtitlesPid.toString())
  }

  resize(_: IpcMainEvent, position: ResizeProps) {
    this.sendVlcCommand(MessageDataType.RESIZE, JSON.stringify(position))
  }

  close() {
    super.close()
    if (this.process) {
      this.clear(this.process)
    }
  }
}
