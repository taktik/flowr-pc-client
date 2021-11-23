import type { ChildProcess } from 'child_process'
import { EOL } from 'os'

enum MessageType {
  VLC = 'vlc',
  LOG = 'log',
  ERROR = 'error',
  UNKNOWN = 'unknown',
  ALIVE = 'alive',
}

enum VLCLogLevel {
  DEBUG = 'Debug',
  WARN = 'Warning',
  ERROR = 'Error',
  INFO = 'Info',
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
}

interface LogMessage {
  Timestamp: string
  Level: VLCLogLevel
  MessageTemplate: string
}

class Message implements IMessage {
  static FromJSON(message: string): Message {
    try {
      const deserialized = JSON.parse(message) as IMessage
      return new Message(deserialized.type || MessageType.LOG, deserialized.data ?? { value: message })
    } catch (e) {
      return new Message(MessageType.UNKNOWN, { value: message })
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

  constructor(private childProcess: ChildProcess) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    this.received = this.received.bind(this)
    this.sendFromBuffer = this.sendFromBuffer.bind(this)
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/unbound-method */
    childProcess.stdout.on('data', this.received)
    childProcess.stdin.on('drain', this.sendFromBuffer)
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private received(data: Buffer) {
    const parsed = data
      .toString()
      .split(EOL)
      .filter(line => !!line) // filter empty lines
      .map(Message.FromJSON)
    this.listeners.forEach(listener => parsed.forEach(message => void listener(message)))
  }

  private sendFromBuffer() {
    const message = this.bufferedMessages.shift()

    if (message) {
      if (!this.childProcess.stdin.write(`${message.toJSON()}${EOL}`)) {
        this.bufferedMessages.unshift(message)
      }
    }
  }

  /**
   * Unregister every listener
   */
  destroy(): void {
    this.listeners.clear()
    /* eslint-disable @typescript-eslint/unbound-method */
    this.childProcess.stdout.off('data', this.received)
    this.childProcess.stdin.off('drain', this.sendFromBuffer)
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  send(type: MessageType, data: IMessageData): void {
    this.bufferedMessages.push(new Message(type, data))
    this.sendFromBuffer()
  }

  addListener(listener: MessageListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: MessageListener): void {
    this.listeners.delete(listener)
  }
}

export {
  IMessage,
  IMessageData,
  LogMessage,
  MessageDataType,
  MessageType,
  ProcessMessaging,
  VLCLogLevel,
}