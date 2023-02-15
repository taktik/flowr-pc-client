import { Transform, TransformCallback, TransformOptions } from "stream"

export class RtpPacket {
  constructor(
    public payloadType: number,
    public sequenceNumber: number,
    public timestamp: number,
    public ssrc: number,
    public payload: Buffer
  ) {}
}



/**
 * This class implements a Transform stream. 
 * It is meant to be used as a Rtp packet payload unpacker for MPEGTS (MPEG Transport Stream specified by MPEG-2 part 1). 
 * Currently, it assumes that each chunk represent one UDP packet of OZI Transport Layer that embed one whole RTP packet of OZI Application Layer.
 */
export class RtpUnpacker extends Transform {
  constructor(options: TransformOptions = {}) {
    super(options)
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    const rtpHeader = chunk.slice(0, 12)
    const hasPadding = Boolean(rtpHeader[0] & 0x20)
    const marker = (rtpHeader[1]) >>> 7;
    const payloadType = rtpHeader[1] & 0x7f

    //  If the payload does not correspond to
    //    1. A full <=> Marker = M = 1 
    //    2. Audio/Video MPEG2 packet <=> Payload Type = PT = 33
    //  the packet is left unchanged and passed through for FFmpeg to deal with.
    //  Ref: https://en.wikipedia.org/wiki/Real-time_Transport_Protocol#:~:text=The%20RTP%20header%20has%20a,the%20particular%20class%20of%20application.
    if(payloadType !== 33 || marker !== 1){
      callback(null, chunk)
    } else {
      const sequenceNumber = rtpHeader.readUInt16BE(2)
      const timestamp = rtpHeader.readUInt32BE(4)
      const ssrc = rtpHeader.readUInt32BE(8)

      let payloadStart = 12
      let extensionLength = 0
      if (rtpHeader[0] & 0x10) {
        // Has Extension
        extensionLength = rtpHeader.readUInt16BE(12)
        payloadStart += 4 + extensionLength
      }

      if (hasPadding) {
        const paddingLength = chunk[chunk.length - 1]
        if (paddingLength > 0) {
          // Has Padding
          const packetLength = chunk.length
          const lastByteIndex = packetLength - 1
          const paddingStart = packetLength - paddingLength
          if (paddingStart > payloadStart) {
            // Padding bytes should be zeroed out
            chunk.fill(0, paddingStart, lastByteIndex)
          }
          chunk = chunk.slice(0, paddingStart)
        }
      }

      const payloadEnd = chunk.length
      const payload = chunk.slice(payloadStart, payloadEnd)
      const packet = new RtpPacket(payloadType, sequenceNumber, timestamp, ssrc, payload)

      callback(null, packet.payload)
    }
  }
}