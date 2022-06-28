export type FlowrApiConfig = {
  host?: string
  hostProxy?: string
}

export type FlowrConfig = {
  ozoneApi: FlowrApiConfig
  flowrApi: FlowrApiConfig
  socketApi: FlowrApiConfig
  pushVodSocketApi: FlowrApiConfig
  aneviaVodSocketApi: FlowrApiConfig
}
