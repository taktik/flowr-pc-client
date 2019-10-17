import { UserStoredFeature } from '.'
import { CallingNumber } from '../views/phone'

export class Favorites extends UserStoredFeature<CallingNumber> {
  add(callingNumber: CallingNumber) {
    const exists = this.list.some(favorite => favorite.name === callingNumber.name && favorite.value === callingNumber.value)
    if (!exists) {
      super.add(callingNumber)
    }
  }

  remove(callingNumber: CallingNumber) {
    const index = this.list.indexOf(callingNumber)

    if (index > -1) {
      const list = [...this.list.slice(0, index), ...this.list.slice(index + 1)]
      this.save({ user: this.user, list })
    }
  }
}
