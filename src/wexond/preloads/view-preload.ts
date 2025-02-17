import { ipcRenderer, webFrame } from 'electron'
import { setupInactivityListeners } from '../../inactivity/setupListeners'

export type ExecuteScriptProps = {
  tabId: number
  details: { code: string }
  extensionId: string
  responseId: number
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

const setImmediateTemp = setImmediate

process.once('loaded', () => {
  global.setImmediate = setImmediateTemp
  setupInactivityListeners(ipcRenderer)
})
