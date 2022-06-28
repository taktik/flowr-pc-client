import { ipcMain, session, webContents, OnBeforeSendHeadersListenerDetails, OnBeforeRequestListenerDetails, Response, OnHeadersReceivedListenerDetails, IpcMainEvent, BeforeSendResponse, HeadersReceivedResponse } from 'electron'
import { makeId } from '~/shared/utils/string'
import { matchesPattern } from '~/shared/utils/url'
import { USER_AGENT } from '~/shared/constants'
import { existsSync, readFile, writeFile, mkdirSync } from 'fs'
import { resolve } from 'path'
import { appWindow, settings } from '..'
import Axios from 'axios'
import {
  FiltersEngine,
  makeRequest,
  updateResponseHeadersWithCSP,
} from '@cliqz/adblocker'
import { parse } from 'tldts'
import { getPath } from '~/shared/utils/paths/main'
import type { AppWindow } from '../app-window'
import { getLogger } from 'src/frontend/src/logging/loggers'

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

const eventListeners: {[name: string]: { id: number, filters: string[], webContentsId: number }[]} = {}

const log = getLogger('Load filters')

export const loadFilters = (): Promise<void> => {
  if (!existsSync(getPath('adblock'))) {
    mkdirSync(getPath('adblock'))
  }

  const path = resolve(getPath('adblock/cache.dat'))

  /*const { data } = await requestURL(
    'https://raw.githubusercontent.com/MajkiIT/polish-ads-filter/master/polish-adblock-filters/adblock.txt',
  );*/

  const downloadFilters = (): Promise<void> => {
    const ops = []

    for (const key in lists) {
      ops.push(Axios.get(lists[key]).catch(error => log.warn('Failed to load filter at', lists[key], error)))
    }

    return Axios.all(ops).then(res => {
      let data = ''

      for (const res1 of res) {
        if (res1) data += res1.data
      }

      engine = FiltersEngine.parse(data)

      return new Promise<void>((resolveProm, rej) => {
        writeFile(path, engine.serialize(), err => {
          if (err) {
            console.error(err)
            return rej(err)
          }
          resolveProm()
        })
      })
    })
  }

  if (existsSync(path)) {
    return new Promise((res, rej) => {
      readFile(resolve(path), (err, buffer) => {
        if (err) {
          console.error(err)
          return rej(err)
        }

        try {
          engine = FiltersEngine.deserialize(buffer)
          res()
        } catch (e) {
          downloadFilters()
            .then(res)
            .catch(rej)
        }
      })
    })
  }

  return downloadFilters()
}

const getTabByWebContentsId = (window: AppWindow, id: number) => {
  for (const key in window.viewManager.views) {
    const view = window.viewManager.views[key]

    if (view.webContents.id === id) {
      return view.tabId
    }
  }

  return -1
}

const getRequestType = (type: string): string => {
  if (type === 'mainFrame') return 'main_frame'
  if (type === 'subFrame') return 'sub_frame'
  if (type === 'cspReport') return 'csp_report'
  return type
}

export type ExtraDetails = Omit<OnBeforeRequestListenerDetails, 'uploadData'> & {
  requestId: string
  frameId: number
  parentFrameId: number
  type: string
  timeStamp: number
  tabId: number
  error: string
  requestHeaders?: Record<string, string[]>
  responseHeaders?: Record<string, string[]>
}

const getDetails = (details: Omit<OnBeforeRequestListenerDetails, 'uploadData'>, window: AppWindow, isTabRelated: boolean): ExtraDetails => {
  return {
    ...details,
    requestId: details.id.toString(),
    frameId: 0,
    parentFrameId: -1,
    type: getRequestType(details.resourceType),
    timeStamp: Date.now(),
    tabId: isTabRelated
      ? getTabByWebContentsId(window, details.webContentsId)
      : -1,
    error: '',
  }
}

const matchesFilter = (filters: string[], url: string): boolean => {
  if (filters && Array.isArray(filters)) {
    for (const filter of filters) {
      if (matchesPattern(filter, url)) {
        return true
      }
    }
  }
  return false
}

const getCallback = <T> (callback: (d: T) => void) => {
  let callbackCalled = false

  return function cb(data: T) {
    if (!callbackCalled) {
      callback(data)
      callbackCalled = true
    }
  }
}

type AnyResponse = Response | BeforeSendResponse | HeadersReceivedResponse

function isResponse(response: AnyResponse): response is Response {
  return !!(response as Response).redirectURL
}

function isBeforeSendResponse(response: AnyResponse): response is BeforeSendResponse {
  return !!(response as BeforeSendResponse).requestHeaders
}

function isHeadersReceivedResponse(response: AnyResponse): response is HeadersReceivedResponse {
  return !!(response as HeadersReceivedResponse).responseHeaders
}

const interceptRequest = (
  eventName: string,
  details: ExtraDetails,
  callback: (beforeSendResponse: AnyResponse) => void = null,
) => {
  let isIntercepted = false

  const defaultRes = {
    cancel: false,
    requestHeaders: details.requestHeaders,
    responseHeaders: details.responseHeaders,
  }

  const cb = getCallback(callback)

  if (Array.isArray(eventListeners[eventName]) && callback) {
    for (const event of eventListeners[eventName]) {
      if (!matchesFilter(event.filters, details.url)) {
        continue
      }
      const id = makeId(32)

      ipcMain.once(
        `api-webRequest-response-${eventName}-${event.id}-${id}`,
        (e: any, res: AnyResponse) => {
          if (res) {
            if (res.cancel) {
              return cb({ cancel: true })
            }

            if (isResponse(res)) {
              return cb({
                cancel: false,
                redirectURL: res.redirectURL,
              })
            }

            if (
              isBeforeSendResponse(res) && (eventName === 'onBeforeSendHeaders' || eventName === 'onSendHeaders')
            ) {
              return cb({ cancel: false, requestHeaders: res.requestHeaders })
            }

            if (isHeadersReceivedResponse(res)) {
              const responseHeaders = {
                ...details.responseHeaders,
                ...res.responseHeaders,
              }

              return cb({
                responseHeaders,
                cancel: false,
              })
            }
          }

          cb(defaultRes)
        },
      )

      const contents = webContents.fromId(event.webContentsId)
      contents.send(
        `api-webRequest-intercepted-${eventName}-${event.id}`,
        details,
        id,
      )

      isIntercepted = true
    }
  }

  if (!isIntercepted && callback) {
    cb(defaultRes)
  }
}

export const runWebRequestService = (window: AppWindow): void => {
  const webviewRequest = session.fromPartition('persist:view').webRequest

  // onBeforeSendHeaders

  const onBeforeSendHeaders = (details: OnBeforeSendHeadersListenerDetails, callback: (beforeSendResponse: BeforeSendResponse) => void) => {
    interceptRequest('onBeforeSendHeaders', getDetails(details, window, true), callback)
  }

  webviewRequest.onBeforeSendHeaders((details: OnBeforeSendHeadersListenerDetails, callback: (beforeSendResponse: BeforeSendResponse) => void) => {
    details.requestHeaders['User-Agent'] = USER_AGENT
    details.requestHeaders['DNT'] = '1'

    onBeforeSendHeaders(details, callback)
  })

  // onBeforeRequest

  const onBeforeRequest = (details: OnBeforeRequestListenerDetails, callback: (response: Response) => void) => {
    const newDetails = getDetails(details, window, true)
    interceptRequest('onBeforeRequest', newDetails, callback)
  }

  webviewRequest.onBeforeRequest(
    (details: OnBeforeRequestListenerDetails, callback: (response: Response) => void) => {
      const tabId = getTabByWebContentsId(window, details.webContentsId)

      if (engine && settings.isShieldToggled) {
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

      onBeforeRequest(details, callback)
    },
  )

  // onHeadersReceived

  const onHeadersReceived = (details: OnHeadersReceivedListenerDetails, callback: any) => {
    const newDetails: ExtraDetails = {
      ...getDetails(details, window, true),
      responseHeaders: details.responseHeaders,
    }
    interceptRequest('onHeadersReceived', newDetails, callback)
  }

  webviewRequest.onHeadersReceived(
    (details: OnHeadersReceivedListenerDetails, callback: any) => {
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

      onHeadersReceived(details, callback)
    },
  )

  // onSendHeaders

  const onSendHeaders = (details: any) => {

    interceptRequest('onSendHeaders', getDetails(details, window, true))
  }

  webviewRequest.onSendHeaders((details: any) => {
    onSendHeaders(details)
  })

  // onCompleted

  const onCompleted = (details: any) => {
    const newDetails = getDetails(details, window, true)
    interceptRequest('onCompleted', newDetails)
  }

  webviewRequest.onCompleted((details: any) => {
    onCompleted(details)
  })

  // onErrorOccurred

  const onErrorOccurred = (details: any) => {
    const newDetails = getDetails(details, window, true)
    interceptRequest('onErrorOccurred', newDetails)
  }

  webviewRequest.onErrorOccurred((details: any) => {
    onErrorOccurred(details)
  })

  // Handle listener add and remove.

  ipcMain.on('api-add-webRequest-listener', (e: IpcMainEvent, data: { id: number, name: string, filters: string[] }) => {
    const { id, name, filters } = data

    const item = {
      id,
      filters,
      webContentsId: e.sender.id,
    }

    if (eventListeners[name]) {
      eventListeners[name].push(item)
    } else {
      eventListeners[name] = [item]
    }
  })

  ipcMain.on('api-remove-webRequest-listener', (e: IpcMainEvent, data: { id: number, name: string }) => {
    const { id, name } = data
    if (eventListeners[name]) {
      eventListeners[name] = eventListeners[name].filter(
        (x) => x.id !== id && x.webContentsId !== e.sender.id,
      )
    }
  })
}
