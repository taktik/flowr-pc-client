import * as React from 'react'
import { PhoneFavorite } from '../favorites'
import { HistoryElement } from './historyElement'
import { PhoneHistory } from '.'

interface HistoryProps {
  phoneCalls: PhoneHistory[]
  favorites: PhoneFavorite[]
  select: (phoneNumber: string) => void
}

export class HistoryView extends React.Component<HistoryProps> {
  findFavoriteForNumber(phoneNumber: string): PhoneFavorite | undefined {
    return this.props.favorites.find(favorite => favorite.number === phoneNumber)
  }

  back() {
    this.props.select('')
  }

  render() {
    return (
      <div>
        <div onClick={this.back.bind(this)}>Back</div>
        {
          this.props.phoneCalls.map(call => (<HistoryElement favorite={this.findFavoriteForNumber(call.number)} select={this.props.select} {...call}></HistoryElement>))
        }
      </div>
    )
  }
}
