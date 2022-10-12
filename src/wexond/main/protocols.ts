import { app, protocol, Session } from 'electron';
import { join } from 'path';
import { parse } from 'url';

const applets = ['newtab'];

export const registerProtocols = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'wexond',
      privileges: { bypassCSP: true, secure: true },
    },
  ]);

  app.on('session-created', (sess: Session) => {
    sess.protocol.registerFileProtocol(
      'wexond',
      (request, callback: any) => {
        const parsed = parse(request.url);

        if (applets.indexOf(parsed.hostname) !== -1) {
          if (parsed.path === '/') {
            return callback({
              path: join(app.getAppPath(), 'build', 'applets.html'),
            });
          }

          return callback({
            path: join(app.getAppPath(), 'build', parsed.path),
          });
        }

        if (parsed.path === '/') {
          return callback({
            path: join(
              app.getAppPath(),
              'static/pages',
              `${parsed.hostname}.html`,
            ),
          });
        }

        return callback({
          path: join(app.getAppPath(), 'static/pages', parsed.path),
        });
      },
    );
  });
};
