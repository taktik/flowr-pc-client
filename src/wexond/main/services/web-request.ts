import { FiltersEngine, makeRequest, updateResponseHeadersWithCSP } from '@cliqz/adblocker'
import Axios from 'axios'
import { HeadersReceivedResponse, OnBeforeRequestListenerDetails, OnHeadersReceivedListenerDetails, Response, session } from 'electron'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { parse } from 'tldts'
import { getPath } from '~/shared/utils/paths/main'
import { getLogger } from 'src/frontend/src/logging/loggers'
import { appWindow, settings } from '..'
import { AppWindow } from '../app-window'
import { WEXOND_PARTITION } from '../../../common/partitions'

const lists: {[key: string]: string} = {
  easylist: 'https://easylist.to/easylist/easylist.txt',
  easyprivacy: 'https://easylist.to/easylist/easyprivacy.txt',
  nocoin:
    'https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt',
  'ublock-filters':
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
  'ublock-badware':
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
  'ublock-privacy':
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
  'ublock-unbreak':
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
}

export let engine: FiltersEngine

const log = getLogger('Load filters')
const adblockPath = getPath('adblock')
const path = resolve(adblockPath, 'cache.dat')

const persistList = async (data: Uint8Array): Promise<void> => {
  try {
    await writeFile(path, data)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('Failed to persist downloaded ad list.', error)
      throw error
    }
    // Attempt to create parent directory
    await mkdir(adblockPath)
    return persistList(data)
  }
}

const downloadFilters = async (): Promise<void> => {
  const ops = []

  for (const key in lists) {
    ops.push(Axios.get(lists[key]).catch(error => log.warn('Failed to load filter at', lists[key], error)))
  }

  const res = await Axios.all(ops)

  let data = ''

  for (const res1 of res) {
    if (res1) data += res1.data
  }

  engine = FiltersEngine.parse(data)

  return persistList(engine.serialize())
}

export const loadFilters = async (): Promise<void> => {
  try {
    const buffer = await readFile(resolve(path))

    try {
      engine = FiltersEngine.deserialize(buffer)
    } catch (e) {
      log.info('An error occurred when deserializing cached ad list. Attempt to download it again.', e)
      return downloadFilters()
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    return downloadFilters()
  }
}

const getTabByWebContentsId = (window: AppWindow, id: number) => {
  for (const key in window.viewManager.views) {
    const view = window.viewManager.views[key]
   
    if (view.webContents?.id === id) {
      return view.tabId
    }
  }

  return -1
}

export const runWebRequestService = (window: AppWindow): void => {
  const webviewRequest = session.fromPartition(WEXOND_PARTITION).webRequest

  // onBeforeRequest
  webviewRequest.onBeforeRequest(
    (details: OnBeforeRequestListenerDetails, callback: (response: Response) => void) => {
      if (engine && settings.isShieldToggled) {
        const tabId = getTabByWebContentsId(window, details.webContentsId)
        const { match, redirect } = engine.match(
          makeRequest({ type: details.resourceType, url: details.url }, parse),
        )

        if (match || redirect) {
          appWindow.webContents.send(`blocked-ad-${tabId}`)

          if (redirect) {
            callback({ redirectURL: redirect })
          } else {
            callback({ cancel: true })
          }

          return
        }
      }
      callback({ cancel: false })
    },
  )

  webviewRequest.onHeadersReceived(
    (details: OnHeadersReceivedListenerDetails, callback: (headersReceivedResponse: HeadersReceivedResponse) => void) => {
      if (engine) {
        updateResponseHeadersWithCSP(
          {
            url: details.url,
            type: details.resourceType as chrome.webRequest.ResourceType,
            tabId: getTabByWebContentsId(window, details.webContentsId),
            method: details.method,
            statusCode: details.statusCode,
            statusLine: details.statusLine,
            requestId: details.id.toString(),
            frameId: 0,
            parentFrameId: -1,
            timeStamp: details.timestamp,
          },
          engine.getCSPDirectives(
            makeRequest(
              {
                sourceUrl: details.url,
                type: details.resourceType,
                url: details.url,
              },
              parse,
            ),
          ),
        )
      }
      callback({ cancel: false })
    },
  )
}
