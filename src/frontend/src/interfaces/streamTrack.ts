export interface IStream {
  tracks: IStreamTrack[]
  currentStream?: number
}

export interface IStreamTrack {
  index: number
  pid: number
  codecName?: string
  code?: string
}
