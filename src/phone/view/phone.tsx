import * as React from 'react'
import { ConnectionState } from '../connectionState';
import { IpcRenderer } from 'electron';
import { WindowModes } from '../WindowModes';
import { WindowResize } from './windowResize';

declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}

interface PhoneProps {
  phoneServer: string
}

interface PhoneState {
  connectionState: ConnectionState,
  mode?: WindowModes
}

export class Phone extends React.Component<PhoneProps, PhoneState> {
  private _ipc: IpcRenderer = window.ipcRenderer

  constructor(props: PhoneProps) {
    super(props)

    this.state = {
      connectionState: new ConnectionState(props.phoneServer),
    }

    this._ipc.on('window-mode-changed', this.windowModeChanged.bind(this))
  }

  maximize() {
    this._ipc.send('phone-maximize')
  }

  reduce() {
    this._ipc.send('phone-reduce')
  }

  windowModeChanged(mode: WindowModes) {
    this.setState({ mode })
  }

  render() {
    return (
      <div>
        <WindowResize maximize={this.maximize} reduce={this.reduce} mode={this.state.mode} />
      </div>
    )
  }
}
