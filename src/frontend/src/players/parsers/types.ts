type OutputParserResponse = {
  initSegment?: Buffer
  data: Buffer
}

interface IOutputParser {
  parse(chunk: Buffer): OutputParserResponse
}

export {
  IOutputParser,
  OutputParserResponse,
}
