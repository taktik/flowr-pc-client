import { ipcRenderer, webFrame, IpcRendererEvent } from 'electron'
import { webContents } from '@electron/remote'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getAPI } from '~/shared/utils/extensions'
import { format, parse } from 'url'
import { IpcExtension } from '~/shared/models'
import { runInThisContext } from 'vm'
import { setupInactivityListeners } from '../../inactivity/setupListeners'
import { API } from '../extensions'

export type ExecuteScriptProps = {
  tabId: number
  details: { code: string }
  extensionId: string
  responseId: number
}

type Script = {
  matches: string[]
  js: { url: string, code: string }[]
  css: { url: string, code: string }[]
  runAt: string
}

type CustomWindow = {
  chrome: API
  wexond: API
  browser: API
}

type DoNotUnderstandWhichWindow = {
  chrome: {
    webstorePrivate: { install: () => void }
    app: {
      isInstalled: false,
      getIsInstalled: () => false
      getDetails: () => void
      installState: () => void
    }
  }
}

const extensions = ipcRenderer.sendSync(
  'get-extensions',
) as { [key: string]: IpcExtension }

webFrame.executeJavaScript('window', false)
  .then((w: DoNotUnderstandWhichWindow) => {
    w.chrome = {
      webstorePrivate: {
        install: () => {
          // purposefully empty (?)
        },
      },
      app: {
        isInstalled: false,
        getIsInstalled: () => {
          return false
        },
        getDetails: () => {
          // purposefully empty (?)
        },
        installState: () => {
          // purposefully empty (?)
        },
      },
    }
  })
  .catch(console.error)

ipcRenderer.on(
  'execute-script-isolated',
  (
    e: IpcRendererEvent,
    { details, extensionId, responseId }: ExecuteScriptProps,
    webContentsId: number,
  ) => {
    const worldId = getIsolatedWorldId(extensionId)
    injectChromeApi(extensions[extensionId], worldId)

    webFrame.executeJavaScriptInIsolatedWorld(
      worldId,
      [
        {
          code: details.code,
        },
      ],
      false)
      .then((result: any) => {
        webContents
          .fromId(webContentsId)
          .send(`api-tabs-executeScript-${responseId}`, result)
      })
      .catch(console.error)
  },
)

const tabId = parseInt(
  process.argv.find(x => x.startsWith('--tab-id=')).split('=')[1],
  10,
)

const goBack = () => {
  ipcRenderer.send('browserview-call', { tabId, scope: 'webContents.goBack' })
}

const goForward = () => {
  ipcRenderer.send('browserview-call', {
    tabId,
    scope: 'webContents.goForward',
  })
}

window.addEventListener('mouseup', e => {
  if (e.button === 3) {
    goBack()
  } else if (e.button === 4) {
    goForward()
  }
})

let beginningScrollLeft: number = null
let beginningScrollRight: number = null
let horizontalMouseMove = 0
let verticalMouseMove = 0

const resetCounters = () => {
  beginningScrollLeft = null
  beginningScrollRight = null
  horizontalMouseMove = 0
  verticalMouseMove = 0
}

function getScrollStartPoint(x: number, y: number) {
  let left = 0
  let right = 0

  let n = document.elementFromPoint(x, y)

  while (n) {
    if (n.scrollLeft !== undefined) {
      left = Math.max(left, n.scrollLeft)
      right = Math.max(right, n.scrollWidth - n.clientWidth - n.scrollLeft)
    }
    n = n.parentElement
  }
  return { left, right }
}

document.addEventListener('wheel', e => {
  verticalMouseMove += e.deltaY
  horizontalMouseMove += e.deltaX

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    const result = getScrollStartPoint(e.deltaX, e.deltaY)
    beginningScrollLeft = result.left
    beginningScrollRight = result.right
  }
})

ipcRenderer.on('scroll-touch-end', () => {
  if (
    horizontalMouseMove - beginningScrollRight > 150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollRight < 10) {
      goForward()
    }
  }

  if (
    horizontalMouseMove + beginningScrollLeft < -150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollLeft < 10) {
      goBack()
    }
  }

  resetCounters()
})

const matchesPattern = (pattern: string, url: string) => {
  if (pattern === '<all_urls>') {
    return true
  }

  const regexp = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
  return url.match(regexp)
}

const injectChromeApi = (extension: IpcExtension, worldId: number) => {
  const context = getAPI(extension, tabId)

  webFrame.setIsolatedWorldInfo(worldId, { name: window.name })
  webFrame.executeJavaScriptInIsolatedWorld(
    worldId,
    [
      {
        code: 'window',
      },
    ],
    false)
    .then((window: CustomWindow) => {
      window.chrome = window.wexond = window.browser = context
    })
    .catch(console.error)
}

const runContentScript = (
  url: string,
  code: string,
  extension: IpcExtension,
  worldId: number,
) => {
  const parsed = parse(url)
  injectChromeApi(extension, worldId)

  webFrame.executeJavaScriptInIsolatedWorld(worldId, [
    {
      code,
      url: format({
        protocol: parsed.protocol,
        slashes: true,
        hostname: extension.id,
        pathname: parsed.pathname,
      }),
    },
  ]).catch(console.error)
}

const runStylesheet = (url: string, code: string) => {
  const wrapper = `((code) => {
    const styleElement = document.createElement('style');
    styleElement.textContent = code;
    document.head.append(styleElement);
  })`

  const compiledWrapper = runInThisContext(wrapper, {
    filename: url,
    lineOffset: 1,
    displayErrors: true,
  }) as (code: string) => void

  return compiledWrapper.call(window, code) as ReturnType<typeof compiledWrapper>
}

function registerListeners({ runAt }: Script, cb: () => (...args: any[]) => unknown): void {
  const fire = cb()
  function makeOnce<T extends (...args: any[]) => unknown>(callback: T): T {
    let called = false

    return ((...args: any[]): void => {
      if (!called) {
        callback(...args)
        called = true
      }
    }) as T
  }

  if (runAt === 'document_start') {
    process.on('document-start', makeOnce(fire))
  } else if (runAt === 'document_end') {
    process.on('document-end', makeOnce(fire))
  } else {
    document.addEventListener('DOMContentLoaded', fire)
  }
}

const injectContentScript = (script: Script, extension: IpcExtension) => {
  if (
    !script.matches.some((x: string) =>
      matchesPattern(
        x,
        `${location.protocol}//${location.host}${location.pathname}`,
      ),
    )
  ) {
    return
  }

  process.setMaxListeners(0)

  if (script.js) {
    script.js.forEach((js) => {
      registerListeners(script, () => runContentScript.bind(
        window,
        js.url,
        js.code,
        extension,
        getIsolatedWorldId(extension.id),
      ) as typeof runContentScript)
    })
  }

  if (script.css) {
    script.css.forEach((css) => {
      registerListeners(script, () => runStylesheet.bind(window, css.url, css.code) as typeof runStylesheet)
    })
  }
}

let nextIsolatedWorldId = 1000
const isolatedWorldsRegistry: {[id: string]: number} = {}

const getIsolatedWorldId = (id: string) => {
  if (isolatedWorldsRegistry[id]) {
    return isolatedWorldsRegistry[id]
  }
  nextIsolatedWorldId++
  return (isolatedWorldsRegistry[id] = nextIsolatedWorldId)
}

const setImmediateTemp = setImmediate

process.once('loaded', () => {
  global.setImmediate = setImmediateTemp
  setupInactivityListeners(ipcRenderer)
  Object.keys(extensions).forEach(key => {
    const extension = extensions[key]
    const { manifest } = extension

    if (manifest.content_scripts) {
      const readArrayOfFiles = (relativePath: string) => ({
        url: `wexond-extension://${extension.id}/${relativePath}`,
        code: readFileSync(join(extension.path, relativePath), 'utf8'),
      })

      
      try {
        manifest.content_scripts.forEach(script => {
          const newScript: Script = {
            matches: script.matches,
            js: script.js ? script.js.map(readArrayOfFiles) : [],
            css: script.css ? script.css.map(readArrayOfFiles) : [],
            runAt: script.run_at || 'document_idle',
          }

          injectContentScript(newScript, extension)
        })
      } catch (readError) {
        console.error('Failed to read content scripts', readError)
      }
    }
  })
})
