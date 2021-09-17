import type { ChildProcess } from 'child_process'
import { EOL } from 'os'
import { getLogger } from '../../logging/loggers'

enum MessageType {
  VLC = 'vlc',
  LOG = 'log',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}

enum MessageDataType {
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  RESUME = 'resume',
  SET_SUBTITLES = 'subtitles',
  SET_AUDIO = 'audio',
  RESIZE = 'resize',
}

interface IMessageData {
  type?: MessageDataType | string
  value: string
}

interface IMessage {
  type: MessageType
  data: IMessageData

  toJSON(): string
}

class Message implements IMessage {
  static FromJSON(message: Buffer): Message {
    const toString = message.toString()
    try {
      const deserialized = JSON.parse(toString)
      return new Message(deserialized.type || MessageType.LOG, deserialized.data ?? { value: deserialized })
    } catch (e) {
      return new Message(MessageType.UNKNOWN, { value: toString })
    }
  }

  constructor(public readonly type: MessageType, public readonly data: IMessageData) {}

  toJSON(): string {
    return JSON.stringify({ type: this.type, data: this.data })
  }
}

type MessageListener = (message: Message) => void | Promise<void>

class ProcessMessaging {
  private readonly listeners = new Set<MessageListener>()
  private readonly bufferedMessages: Message[] = []

  constructor(private process: ChildProcess) {
    this.received = this.received.bind(this)
    this.sendFromBuffer = this.sendFromBuffer.bind(this)
    process.stdout.on('data', this.received)
    process.stdin.on('drain', this.sendFromBuffer)
  }

  private received(data: Buffer) {
    const parsed = Message.FromJSON(data)
    this.listeners.forEach(listener => listener(parsed))
  }

  private sendFromBuffer() {
    const message = this.bufferedMessages.shift()

    if (message) {
      if (!this.process.stdin.write(`${message}${EOL}`)) {
        this.bufferedMessages.unshift(message)
      }
    }
  }

  /**
   * Unregister every listener
   */
  destroy() {
    this.listeners.clear()
    process.stdout.off('data', this.received)
    process.stdin.off('drain', this.sendFromBuffer)
  }

  send(type: MessageType, data: IMessageData) {
    this.bufferedMessages.push(new Message(type, data))
    this.sendFromBuffer()
  }

  addListener(listener: MessageListener) {
    this.listeners.add(listener)
  }

  removeListener(listener: MessageListener) {
    this.listeners.delete(listener)
  }
}

export {
  IMessage,
  IMessageData,
  MessageDataType,
  MessageType,
  ProcessMessaging,
}