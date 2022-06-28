import { ipcRenderer, IpcRendererEvent } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { API } from '.';
import { IpcEvent } from '..';
import { makeId } from '~/shared/utils/string';

let api: API;
let currentTabId: number;

// https://developer.chrome.com/extensions/tabs

export class Tabs {
  public onCreated = new IpcEvent('tabs', 'onCreated');
  public onUpdated = new IpcEvent('tabs', 'onUpdated');
  public onActivated = new IpcEvent('tabs', 'onActivated');
  public onRemoved = new IpcEvent('tabs', 'onRemoved');

  // tslint:disable-next-line
  constructor(_api: API, tabId: number) {
    api = _api;
    currentTabId = tabId;
  }

  public get = (tabId: number, callback: (tab: chrome.tabs.Tab) => void): void => {
    this.query({}, tabs => {
      callback(tabs.find(x => x.id === tabId));
    });
  };

  public getCurrent = (callback: (tab: chrome.tabs.Tab) => void): void => {
    this.get(currentTabId, tab => {
      callback(tab);
    });
  };

  public query = (
    queryInfo: chrome.tabs.QueryInfo,
    callback: (tabs: chrome.tabs.Tab[]) => void,
  ): void => {
    ipcRenderer.send('api-tabs-query');

    ipcRenderer.once(
      'api-tabs-query',
      (e: IpcRendererEvent, data: chrome.tabs.Tab[]) => {
        const readProperty = <T extends chrome.tabs.Tab | chrome.tabs.QueryInfo, U extends keyof T>(obj: T, prop: U) => obj[prop];

        callback(
          data.filter(tab => {
            for (const key in queryInfo) {
              const tabProp = readProperty(tab, key as keyof chrome.tabs.Tab) // I know, wrong type assertion...
              const queryInfoProp = readProperty(queryInfo, key as keyof chrome.tabs.QueryInfo)

              if (key === 'url' && queryInfoProp === '<all_urls>') {
                return true;
              }

              if (tabProp === null || queryInfoProp !== tabProp) {
                return false;
              }
            }

            return true;
          }),
        );
      },
    );
  };

  public create = (
    createProperties: chrome.tabs.CreateProperties,
    callback: (tab: chrome.tabs.Tab) => void = null,
  ): void => {
    ipcRenderer.send('api-tabs-create', createProperties);

    if (callback) {
      ipcRenderer.once(
        'api-tabs-create',
        (e: IpcRendererEvent, data: chrome.tabs.Tab) => {
          callback(data);
        },
      );
    }
  };

  public insertCSS = (arg1: any = null, arg2: any = null, arg3: any = null): void => {
    const insertCSS = (tabId: number, details: chrome.tabs.InjectDetails, callback: () => void) => {
      if (Object.prototype.hasOwnProperty.call(details, 'file')) {
        details.code = readFileSync(
          join(api._extension.path, details.file),
          'utf8',
        );
      }

      ipcRenderer.send('api-tabs-insertCSS', tabId, details);

      ipcRenderer.once('api-tabs-insertCSS', () => {
        if (callback) {
          callback();
        }
      });
    };

    if (typeof arg1 === 'object') {
      this.getCurrent(tab => {
        insertCSS(tab.id, arg1, arg2);
      });
    } else if (typeof arg1 === 'number') {
      insertCSS(arg1, arg2, arg3);
    }
  };

  public executeScript = (
    arg1: any = null,
    arg2: any = null,
    arg3: any = null,
  ): void => {
    const executeScript = (tabId: number, details: chrome.tabs.InjectDetails, callback: (res: any) => void) => {
      if (Object.prototype.hasOwnProperty.call(details, 'file')) {
        details.code = readFileSync(
          join(api._extension.path, details.file),
          'utf8',
        );
      }

      const responseId = makeId(32);
      ipcRenderer.send('api-tabs-executeScript', {
        tabId,
        details,
        responseId,
        extensionId: api.runtime.id,
      });

      ipcRenderer.once(
        `api-tabs-executeScript-${responseId}`,
        (e: IpcRendererEvent, result: any) => {
          if (callback) {
            callback(result);
          }
        },
      );
    };

    if (typeof arg1 === 'object') {
      this.getCurrent(tab => {
        if (tab) {
          executeScript(tab.id, arg1, arg2);
        }
      });
    } else if (typeof arg1 === 'number') {
      executeScript(arg1, arg2, arg3);
    }
  };

  public setZoom = (
    tabId: number,
    zoomFactor: number,
    callback: () => void,
  ): void => {
    ipcRenderer.send('api-tabs-setZoom', tabId, zoomFactor);

    ipcRenderer.once('api-tabs-setZoom', () => {
      if (callback) {
        callback();
      }
    });
  };

  public getZoom = (tabId: number, callback: (zoomFactor: number) => void): void => {
    ipcRenderer.send('api-tabs-getZoom', tabId);

    ipcRenderer.once(
      'api-tabs-getZoom',
      (e: IpcRendererEvent, zoomFactor: number) => {
        if (callback) {
          callback(zoomFactor);
        }
      },
    );
  };

  public detectLanguage = (
    tabId: number,
    callback: (language: string) => void,
  ): void => {
    ipcRenderer.send('api-tabs-detectLanguage', tabId);

    ipcRenderer.once(
      'api-tabs-detectLanguage',
      (e: IpcRendererEvent, language: string) => {
        if (callback) {
          callback(language);
        }
      },
    );
  };

  public update = (): void => {
    // purposefully empty (?)
  };
}
