import { ipcMain, app, session, BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { resolve } from 'path';
import { platform } from 'os';
import { AppWindow, WexondOptions } from './app-window';
import { loadExtensions } from './extensions';
import { registerProtocols } from './protocols';
import { runWebRequestService, loadFilters } from './services/web-request';
import { existsSync, writeFileSync } from 'fs';
import { getPath } from '../shared/utils/paths/main';
import { Settings } from '../renderer/app/models/settings';
import { makeId } from '../shared/utils/string';
import * as electronLog from 'electron-log'
import { enable } from '@electron/remote/main'
import { getLogger } from 'src/frontend/src/logging/loggers';

export let settings: Settings = {};
export let appWindow: AppWindow | null
export let log = electronLog
export function setWexondLog(logger: typeof log): void {
  log = logger
}

const flowrLog = getLogger('Wexond')

ipcMain.on('settings', (e: any, s: Settings) => {
  settings = { ...settings, ...s };
});

registerProtocols();

app.on('ready', () => {
  const defaultSession = session.defaultSession

  if (defaultSession) {
    defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        if (permission === 'notifications' || permission === 'fullscreen') {
          callback(true);
        } else {
          callback(false);
        }
      },
    );
  }
});

app.on('window-all-closed', () => {
  if (platform() !== 'darwin') {
    app.quit();
  }
});

export async function createWexondWindow(wexondOptions: WexondOptions, parentWindow?: BrowserWindow, defaultBrowserWindow: BrowserWindowConstructorOptions = {}): Promise<AppWindow> {
  const settingsPath = getPath('settings.json')

  if (settingsPath && !existsSync(settingsPath)) {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        dialType: 'top-sites',
        isDarkTheme: false,
        isShieldToggled: false,
      } as Settings),
    );
  }

  appWindow = new AppWindow(wexondOptions, parentWindow, defaultBrowserWindow);
  enable(appWindow.webContents)

  appWindow.on('close', () => {
    appWindow = null
  })

  session
    .fromPartition('persist:view')
    .on('will-download', (event, item) => {
      const fileName = item.getFilename();
      const savePath = resolve(app.getPath('downloads'), fileName);
      const id = makeId(32);

      item.setSavePath(savePath);

      appWindow.webContents.send('download-started', {
        fileName,
        receivedBytes: 0,
        totalBytes: item.getTotalBytes(),
        savePath,
        id,
      });

      item.on('updated', (_, state) => {
        if (state === 'interrupted') {
          log.info('Download is interrupted but can be resumed');
        } else if (state === 'progressing') {
          if (item.isPaused()) {
            log.info('Download is paused');
          } else {
            appWindow.webContents.send('download-progress', {
              id,
              receivedBytes: item.getReceivedBytes(),
            });
          }
        }
      });
      item.once('done', (_, state) => {
        if (state === 'completed') {
          appWindow.webContents.send('download-completed', id);
        } else {
          log.info(`Download failed: ${state}`)
        }
      });
    });

  try {
    await loadFilters()
  } catch (error) {
    flowrLog.warn('Failed to load filters', error)
  }
  try {
    await loadExtensions()
  } catch (error) {
    flowrLog.warn('Failed to load extensions', error)
  }
  runWebRequestService(appWindow)
  return appWindow
}
