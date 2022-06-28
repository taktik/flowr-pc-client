import { ipcRenderer } from 'electron';
import { getCurrentWindow } from '@electron/remote'
import store from '~/renderer/app/store';

export const closeWindow = (): void => {
  getCurrentWindow().close();
};

export const minimizeWindow = (): void => {
  getCurrentWindow().minimize();
};

export const maximizeWindow = (): void => {
  const currentWindow = getCurrentWindow();

  if (currentWindow.isMaximized()) {
    currentWindow.unmaximize();
  } else {
    currentWindow.maximize();
  }
};

export function backToFlowr(): void {
  const param = new URLSearchParams(location.search);
  if (param.has('clearBrowsingDataAtClose')) {
    store.history.clear();
    ipcRenderer.send('clear-browsing-data');
  }
  ipcRenderer.send('open-flowr')
}
