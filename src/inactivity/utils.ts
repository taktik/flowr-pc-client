export const ACTIVITY_EVENT = 'webpage-activity'

export interface IInactivityConfig {
  timeout: number
  callback: () => void
}
