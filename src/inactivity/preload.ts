import { ipcRenderer } from 'electron'
import { setupInactivityListeners } from '../inactivity/setupListeners'

setupInactivityListeners(ipcRenderer)
