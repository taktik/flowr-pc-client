import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ClickableIcon } from '../clickableIcon';

export interface ResizeProps {
  hide: () => void,
  className?: string,
}

export class CloseWindow extends React.Component<ResizeProps> {
  render() {
    return (<ClickableIcon className={this.props.className} onClick={this.props.hide} icon="window-close" />)
  }
}
