import { Writable } from 'stream'

export interface Dispatcher {
  // override of the super type signature (defined in "internal")
  pipe<T extends Writable>(stream: T): T
}

export class Dispatcher extends Writable {
  private _outputs: Set<Writable> = new Set()

  constructor() {
    super()
    this.onError = this.onError.bind(this)
  }

  // tslint:disable-next-line: function-name
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
    try {
      this._outputs.forEach(output => output.write(chunk))
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  onError(err: Error) {
    this.emit('error', err)
  }

  pipe<T extends Writable>(stream: T): T {
    this._outputs.add(stream)
    stream.on('error', this.onError)
    stream.on('close', () => {
      this.unpipe(stream)
      stream.removeAllListeners()
    })
    return stream
  }

  unpipe(stream: Writable) {
    stream.off('error', this.onError)
    this._outputs.delete(stream)
  }

  clear() {
    this._outputs.forEach(stream => stream.off('error', this.onError))
    this._outputs.clear()
  }
}
