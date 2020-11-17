export const ACTIVITY_EVENT = 'webpage-activity'

export const INACTIVITY_THROTTLE = 10000

export interface IInactivityConfig {
  timeout: number
  callback: () => void
}
