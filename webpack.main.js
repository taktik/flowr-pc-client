/* eslint-disable */

const { DefinePlugin } = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { getOptimization, webpackModule, resolve, Mode, output, RENDERER_SERVER_PORT } = require('./webpack/utils')

module.exports = async (env) => {
    const mode = (env && env.production) ? Mode.PRODUCTION : Mode.DEVELOPMENT
    const optimization = getOptimization(mode)

   return {
            entry: { main: './src/launcher/index.ts' },
            output,
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
                new CleanWebpackPlugin(),
            ],
            externals: {
                fs: 'commonjs fs',
                path: 'commonjs path',
                os: 'commonjs os',
                process: 'commonjs process',
                leveldown: 'commonjs leveldown',
                'node-window-manager': 'commonjs node-window-manager',
            },
        }
}