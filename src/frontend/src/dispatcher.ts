import { Readable, Writable } from 'stream'

export interface Dispatcher {
  // override of the super type signature (defined in "internal")
  pipe<T extends Readable>(stream: T): T
}

export class Dispatcher extends Writable {
  private _readers: Set<Readable> = new Set()

  constructor() {
    super()
    this.onError = this.onError.bind(this)
  }

  // tslint:disable-next-line: function-name
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
    try {
      this._readers.forEach(reader => reader.push(chunk))
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  onError(err: Error) {
    this.emit('error', err)
  }

  pipe<T extends Readable>(stream: T): T {
    this._readers.add(stream)
    stream.on('error', this.onError)
    stream.on('close', () => {
      this.unpipe(stream)
      stream.removeAllListeners()
    })
    return stream
  }

  unpipe(stream: Readable) {
    stream.off('error', this.onError)
    this._readers.delete(stream)
  }
}
