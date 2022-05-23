import { ipcRenderer } from 'electron';

import { API } from '.';
import { makeId } from '~/shared/utils/string';

// https://developer.chrome.com/extensions/storage

let api: API;

const sendStorageOperation = (
  extensionId: string,
  arg: unknown,
  area: string,
  type: string,
  callback: (data: {[key: string]: unknown}) => void,
) => {
  const id = makeId(32);
  ipcRenderer.send('api-storage-operation', {
    extensionId,
    id,
    arg,
    type,
    area,
  });

  if (callback) {
    ipcRenderer.once(
      `api-storage-operation-${id}`,
      (e: any, data?: {[key: string]: unknown}) => {
        callback(data);
      },
    );
  }
};

export class StorageArea {
  private _area: string;

  constructor(area: string) {
    this._area = area;
  }

  public set = (arg: unknown, cb: (data: {[key: string]: unknown}) => void): void => {
    sendStorageOperation(api.runtime.id, arg, this._area, 'set', cb);
  };

  public get = (arg: unknown, cb: (data: {[key: string]: unknown}) => void): void => {
    sendStorageOperation(api.runtime.id, arg, this._area, 'get', cb);
  };

  public remove = (arg: unknown, cb: (data: {[key: string]: unknown}) => void): void => {
    sendStorageOperation(api.runtime.id, arg, this._area, 'remove', cb);
  };

  public clear = (arg: unknown, cb: (data: {[key: string]: unknown}) => void): void => {
    sendStorageOperation(api.runtime.id, arg, this._area, 'clear', cb);
  };
}

export class Storage {
  public local = new StorageArea('local');
  public managed = new StorageArea('managed');

  constructor(_api: API) {
    api = _api;
  }
}
