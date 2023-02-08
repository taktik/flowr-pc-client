type OutputParserResponse = {
  initSegment: Buffer | undefined
  data: Buffer
  canSend: boolean
}

interface IOutputParser {
  parse(chunk: Buffer): OutputParserResponse
}

export {
  IOutputParser,
  OutputParserResponse,
}
