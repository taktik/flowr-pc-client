import { CallingNumber } from '../views/phone'

export function formatCallingNumber(callingNumber: CallingNumber | string) {
  if (typeof callingNumber === 'string') {
    return callingNumber
  }
  return `${callingNumber.name ? `${callingNumber.name}  :` : ''} ${callingNumber.value}`
}
