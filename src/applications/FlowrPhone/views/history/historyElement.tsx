import * as React from 'react'
import { PhoneHistory, PhoneCallStatus } from '.'
import { PhoneFavorite } from '../favorites'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatElapsedTime, formatDate } from '../../helper/time'
import styled from 'styled-components'
import { CallingNumber } from '../phone'
import { formatCallingNumber } from '../../helper/format'

interface HistoryElementProps extends PhoneHistory {
  favorite?: PhoneFavorite
  select: (phoneNumber: CallingNumber) => void
}

const StyledIcon = styled(FontAwesomeIcon)`
  width: 28px;
`

export class HistoryElement extends React.Component<HistoryElementProps> {
  select() {
    if (this.props.favorite) {
      this.props.select({ name: this.props.favorite.name, value: this.props.favorite.number })
    } else if (typeof this.props.number === 'string') {
      this.props.select({ value: this.props.number })
    } else {
      this.props.select(this.props.number)
    }
  }

  header(): JSX.Element {
    if (this.props.favorite) {
      return (<div className="header">
        <div className="title">{this.props.favorite.name}</div>
        <div className="number">{this.props.favorite.number}</div>
      </div>)
    }
    return (<div className="header"><div className="title number">{formatCallingNumber(this.props.number)}</div></div>)
  }

  phoneStatusIcon(): JSX.Element {
    switch (this.props.status) {
      case PhoneCallStatus.EMITTED:
        return (<StyledIcon className="emitted" icon="long-arrow-alt-right"></StyledIcon>)
      case PhoneCallStatus.MISSED:
      case PhoneCallStatus.RECEIVED:
        return (<StyledIcon className="received" icon="long-arrow-alt-left"></StyledIcon>)
      default:
        return (<div></div>)
    }
  }

  render() {
    return (
      <div onClick={this.select.bind(this)} className="history-element">
        <div className="statusIcon">{this.phoneStatusIcon()}</div>
        {this.header()}
        <div className="date"><span>{formatDate(this.props.date)}</span></div>
        <div className="elapsedTime">{formatElapsedTime(this.props.duration)}</div>
      </div>
    )
  }
}
