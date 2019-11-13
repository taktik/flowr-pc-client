export interface UserStore<T> {
  user: string
  list: T[]
}

export interface UserStoredFeatureProps {
  currentUser?: string
  size?: number
  save: (payload: {[key: string]: any}) => void
}

export abstract class UserStoredFeature<T> {
  protected _user: string = ''
  list: T[] = []
  save: (payload: {[key: string]: any}) => void
  size: number = 50 // number of entries to keep

  set store(store: UserStore<T> | undefined) {
    const user = store ? store.user : ''

    if (this.user !== user) {
      console.log('Stored user is different from current one, reset data.')
      this.save({ user: this.user, list: [] })
    } else {
      this.list = store ? store.list : []
    }
  }

  get user() {
    return this._user
  }

  set user(user: string) {
    if (this.user !== user) {
      console.log(`Setting different user (from ${this.user} to ${user}), reset data.`)
      this._user = user
      this.save({ user, list: [] })
    }
  }

  constructor(props: UserStoredFeatureProps) {
    this.save = props.save

    if (props.currentUser) {
      this._user = props.currentUser
    }

    if (props.size) {
      this.size = props.size
    }
  }

  add(entry: T) {
    this.save({ user: this.user, list: [...this.list, entry].slice(-this.size) })
  }
}
