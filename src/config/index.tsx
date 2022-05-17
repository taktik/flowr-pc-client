import type { IpcRendererEvent } from 'electron'
import type { ConfigProps } from './types'

import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { Config } from './config'

ipc.on('receiveConfig', (_: IpcRendererEvent, { config, isLaunchedUrlCorrect, lastError }: ConfigProps) => {
    ReactDOM.render(<Config config={config} isLaunchedUrlCorrect={isLaunchedUrlCorrect} lastError={lastError}></Config>, document.getElementById('config'))
})

ipc.send('getAppConfig')
