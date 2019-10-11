import * as React from 'react'
import { PhoneHistory, PhoneCallStatus } from '.'
import { PhoneFavorite } from '../favorites'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatElapsedTime, formatDate } from '../../helper/time'

interface HistoryElementProps extends PhoneHistory {
  favorite?: PhoneFavorite
  select: (phoneNumber: string) => void
}

export class HistoryElement extends React.Component<HistoryElementProps> {
  select() {
    this.props.select(this.props.number)
  }

  header(): JSX.Element {
    if (this.props.favorite) {
      return (<div className="header">
        <div className="title">{this.props.favorite.name}</div>
        <div className="number">{this.props.favorite.number}</div>
      </div>)
    }
    return (<div className="header"><div className="title number">{this.props.number}</div></div>)
  }

  phoneStatusIcon(): JSX.Element {
    switch (this.props.status) {
      case PhoneCallStatus.EMITTED:
        return (<FontAwesomeIcon icon="long-arrow-alt-right"></FontAwesomeIcon>)
      case PhoneCallStatus.MISSED:
      case PhoneCallStatus.RECEIVED:
        return (<FontAwesomeIcon icon="long-arrow-alt-left"></FontAwesomeIcon>)
      default:
        return (<div></div>)
    }
  }

  render() {
    return (
      <div onClick={this.select.bind(this)}>
        {this.header()}
        <div>
          <div>{formatDate(this.props.date)}</div>
          <div>{formatElapsedTime(this.props.duration)}</div>
          {this.phoneStatusIcon()}
        </div>
      </div>
    )
  }
}
