/* eslint-disable */

const { DefinePlugin } = require('webpack')
const { getOptimization, webpackModule, resolve, Mode, output, RENDERER_SERVER_PORT } = require('./webpack/utils')

module.exports = async (env) => {
    const mode = (env && env.production) ? Mode.PRODUCTION : Mode.DEVELOPMENT
    const optimization = getOptimization(mode)

   return {
     entry: { main: './src/launcher/index.ts' },
     output,
     devtool: false,
     target: 'electron-main',
     resolve,
     mode,
     optimization,
     module: webpackModule,
     node: {
       __dirname: true,
     },
     plugins: [
       new DefinePlugin({
         __RENDERER_SERVER_PORT__: JSON.stringify(RENDERER_SERVER_PORT),
       }),
     ],
     externals: {
       fs: 'commonjs fs',
       path: 'commonjs path',
       os: 'commonjs os',
       process: 'commonjs process',
       'node-window-manager': 'commonjs node-window-manager',
       'node:http': 'commonjs http',
       'node:https': 'commonjs https',
     },
   }
}