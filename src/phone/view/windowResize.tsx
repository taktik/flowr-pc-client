import * as React from 'react'
import { WindowModes } from '../WindowModes';

interface ResizeProps {
  maximize: () => void,
  reduce: () => void,
  mode: WindowModes
}

export class WindowResize extends React.Component<ResizeProps> {
  render() {
    if (this.props.mode === WindowModes.WIDGET) {
      return (
        <i onClick={this.props.maximize}></i>
      )
    }

    return (
      <i onClick={this.props.reduce}></i>
    )
  }
}
