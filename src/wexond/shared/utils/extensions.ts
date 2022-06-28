import { ipcRenderer, IpcRendererEvent } from 'electron';
import { webContents } from '@electron/remote'
import { IpcExtension } from '../models';
import { Port, API } from '~/extensions';

type RuntimeMessage = {
  extensionId: string
  portId: string
  sender: chrome.runtime.MessageSender
}

export type RuntimeMessageConnect = RuntimeMessage & { name: string }
export type RuntimeMessageSent = RuntimeMessage & { message: unknown }

export const getAPI = (extension: IpcExtension, tabId: number = null): API => {
  const api = new API(extension, tabId);

  ipcRenderer.on(
    'api-runtime-connect',
    (e: IpcRendererEvent, data: RuntimeMessageConnect) => {
      const { portId, sender, name } = data;
      const port = new Port(portId, name, sender);
      api.runtime.onConnect.emit(port);
    },
  );

  ipcRenderer.on(
    'api-runtime-sendMessage',
    (e: IpcRendererEvent, data: RuntimeMessageSent, webContentsId: number) => {
      const { portId, sender, message } = data;

      const sendResponse = (msg: any) => {
        webContents
          .fromId(webContentsId)
          .send(`api-runtime-sendMessage-response-${portId}`, msg);
      };

      api.runtime.onMessage.emit(message, sender, sendResponse);
      const port = new Port(portId, window.name, sender);
      api.runtime.onConnect.emit(port);
    },
  );

  return api;
};
