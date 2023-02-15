import { TsDecryptor } from '@taktik/ts-decryptor'
import { UdpStreamer } from '@taktik/udp-streamer'
import { Readable, Writable } from 'stream'
import { IPlayerStore } from '../../interfaces/playerStore'
import { Store } from '../../store'
import { IntervalStream } from '../intervalStream'
import { RtpUnpacker } from './rtpUnpacker'

interface IPipeline {
  clear(): Promise<void>
}

interface IReadablePipeline<T extends Readable = Readable> extends IPipeline {
  pipe(input: IPipeline | Writable): void
  output: T
}

interface IWritablePipeline<T extends Writable = Writable> extends IPipeline {
  input: T
}

// udp -> (decryptor ->) interval
class MainPipeline implements IReadablePipeline {
  private udpStreamer: UdpStreamer
  private decryptor?: TsDecryptor
  private intervalStream?: IntervalStream

  get useDecryption(): boolean {
    return this.store.get('decryption').use
  }

  get output(): Readable {
    return this.intervalStream
  }

  constructor(private store: Store<IPlayerStore>) {
    this.udpStreamer = new UdpStreamer(store.get('udpStreamer'))
    this.intervalStream = new IntervalStream(store.get('streamer'))

    if (this.useDecryption) {
      this.decryptor = new TsDecryptor(store.get('tsDecryptor'))
      this.decryptor.pipe(this.intervalStream)
    }
  }

  async connect(url: string): Promise<Readable> {
    const cleanUrl = url
        .replace(/\s/g, '') // remove whitespaces
        .replace(/(udp|rtp):\/\/@?(.+)/, '$2') // retrieve ip:port
    const ip = cleanUrl.split(':')[0]
    const port = parseInt(cleanUrl.split(':')[1], 10)
    const connectionStream = await this.udpStreamer.connect(ip, port)

    const unpackedStream = url.startsWith('rtp://') ? connectionStream.pipe(new RtpUnpacker()) : connectionStream

    if (this.useDecryption) {
      this.decryptor.injest(unpackedStream)
    } else {
      unpackedStream.pipe(this.intervalStream)
    }

    return this.output
  }

  pipe<T extends Writable>(pipeline: IWritablePipeline<T> | T): T {
    return this.output.pipe(pipeline instanceof Writable ? pipeline : pipeline.input)
  }

  unpipe<T extends Writable>(pipeline: IWritablePipeline<T> | T): MainPipeline['output'] {
    return this.output.unpipe(pipeline instanceof Writable ? pipeline : pipeline.input)
  }

  async clear(): Promise<void> {
    await this.udpStreamer.close()
    this.decryptor?.clear()
    this.intervalStream?.clear()
  }
}

export { MainPipeline, IReadablePipeline, IWritablePipeline }
