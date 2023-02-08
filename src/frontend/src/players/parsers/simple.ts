import { IOutputParser, OutputParserResponse } from './types'

class SimpleParser implements IOutputParser {
  parse(chunk: Buffer): OutputParserResponse {
    return {
      initSegment: undefined,
      data: chunk,
      canSend: true,
    }
  }
}

export default SimpleParser
