import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Phone } from './phone'

const url = new URL(window.location.href)

ReactDOM.render(<Phone phoneServer={url.searchParams.get('server')} />, document.getElementById('phone'));
