import { mp4 } from '@taktik/mux.js'
import { getLogger } from '../../logging/loggers'
import { IOutputParser, OutputParserResponse } from './types'

class Mp4Parser implements IOutputParser {
  private log = getLogger('mp4 parser')
  private initSegment?: Buffer
  private initSegmentComplete = false

  private appendToInitSegment(chunk: Buffer): void {
    this.initSegment = this.initSegment ? Buffer.concat([this.initSegment, chunk]) : chunk
  }

  parse(chunk: Buffer): OutputParserResponse {
    let data = chunk

    // Attempt to find a "moof" box in the chunk
    // if it is found, it means we reached the end of the previous box's data
    const [moof] = mp4.tools.findBox(chunk, ['moof'])

    if (!this.initSegmentComplete && moof) {
      // receiving a "moof" means that the initialization segment is complete
      this.initSegmentComplete = true

      /**
       * The call to "findBox" above returns the requested boxes' content if found, without their header
       * The header is composed of 8 bytes: 4 bytes for the boxe's size (in bytes) + 4 bytes for its type (e.g moof, mdat, ftyp, etc...)
       * Thus the "index - 8" below: we want to retrieve the index of the beginning of the whole box, headers included
       */
      const indexBeforeHeaders = chunk.indexOf(moof) - 8

      if (indexBeforeHeaders < 0) {
        this.log.warn('Something is wrong, we detected the first moof box but there is not enough room for its headers ?!')
      } else if (indexBeforeHeaders > 0) {
        this.log.info(`Found first moof at index ${indexBeforeHeaders} in the chunk. Attempt to complete init segment.`)
        this.appendToInitSegment(chunk.slice(0, indexBeforeHeaders))
        data = chunk.slice(indexBeforeHeaders)
      } else {
        // "moof" is at the start of the package, no need to do anything else
      }
    }

    if (!this.initSegmentComplete) {
      this.log.debug('Completing init segment')
      this.appendToInitSegment(chunk)
    }

    return {
      initSegment: this.initSegmentComplete ? this.initSegment : undefined,
      data,
      canSend: this.initSegmentComplete && !!moof,
    }
  }
}

export default Mp4Parser
