import { Transform, TransformCallback, TransformOptions } from 'stream'

/**
    This class implements a Transform stream responsible for unpacking MPEG-TS, MPEG-1 (A/V) and MPEG-2 (A/V) media payload from RTP packet.
    For any other payload types, the full RTP packet will be transfered as is for FFMPEG to deal with.

    Notes:

      MPEG-1/2 Audio payloads are identified by the Payload Type (PT) value of the RTP packet header: PT = 14
      MPEG-1/2 Video payloads are identified by the Payload Type (PT) value of the RTP packet header: PT = 32
      MPEG-TS Audio & Video payloads are identified by the Payload Type (PT) value of the RTP packet header: PT = 33

      According to the specification, MPEG-1/2 payload are simple chunks of stream bytes
      According to the corresponding, the content of a RTP packet will always contain an integral number of MPEG-TS packets

    Refs: 

      https://en.wikipedia.org/wiki/Real-time_Transport_Protocol#:~:text=The%20RTP%20header%20has%20a,the%20particular%20class%20of%20application
      https://datatracker.ietf.org/doc/html/rfc2250
 */

const UNPACKED_PAYLOAD_TYPES: { [key: number]: string } = {
  14: 'MPEG-1/2 Audio',
  32: 'MPEG-1/2 Video',
  33: 'MPEG-TS Audio & Video',
}
export class RtpUnpacker extends Transform {
  constructor(options: TransformOptions = {}) {
    super(options)
  }

  _transform(
    chunk: Buffer,
    _encoding: string,
    callback: TransformCallback,
  ): void {
    const rtpHeader = chunk.slice(0, 12)
    const hasPadding = Boolean(rtpHeader[0] & 0x20)
    const payloadType = rtpHeader[1] & 0x7f

    if (!UNPACKED_PAYLOAD_TYPES[payloadType]) {
      callback(null, chunk)
    } else {
      let payloadStart = 12
      let extensionLength = 0

      if (rtpHeader[0] & 0x10) {
        // Has Extension
        extensionLength = rtpHeader.readUInt16BE(12)
        payloadStart += 4 + extensionLength
      }

      //  If padding is present, its length is encoded in the chunk's last byte: chunk[chunk.length - 1]
      const payloadEnd = hasPadding
        ? chunk.length - chunk[chunk.length - 1]
        : chunk.length
      const payload = chunk.slice(payloadStart, payloadEnd)

      callback(null, payload)
    }
  }
}
