import { app, protocol, Session } from 'electron'
import { parse } from 'url'

const applets = ['newtab']

export const registerProtocols = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'wexond',
      privileges: { bypassCSP: true, secure: true },
    },
  ])

  app.on('session-created', (sess: Session) => {
    sess.protocol.handle('wexond', (request: { url: string }) => {
      const parsed = parse(request.url)

      if (applets.indexOf(parsed.hostname) !== -1) {
        if (parsed.path === '/') {
          return fetch(`file:///${app.getAppPath()}/build/applets.html`)
        }
        return fetch(`file:///${app.getAppPath()}/build/${parsed.path}`)
      }

      if (parsed.path === '/') {
        return fetch(
          `file:///${app.getAppPath()}/static/pages/${
            parsed.hostname
          }.html`,
        )
      }
      return fetch(
        `file:///${app.getAppPath()}/static/pages/${parsed.path}`,
      )
    })
  })
}
