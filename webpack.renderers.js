/* eslint-disable */

const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')
const {
    webpackModule,
    getOptimization,
    output,
    resolve,
    Mode,
    RENDERER_SERVER_PORT,
} = require('./webpack/utils')

module.exports = (env) => {
    const mode = (env && env.production) ? Mode.PRODUCTION : Mode.DEVELOPMENT
    const optimization = getOptimization(mode)
    const baseEntry = {
        app: './src/wexond/renderer/app/index.tsx',
        exportNode: './src/frontend/preloads/exportNode.ts',
        'view-preload': './src/wexond/preloads/view-preload.ts',
        'background-preload': './src/wexond/preloads/background-preload.ts',
        'inactivity-preload': './src/inactivity/preload.ts',
    }
    const basePlugins = [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'static/pages/app.html'),
            filename: 'app.html',
            chunks: ['app'],
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: './static/pages',
                },
            ]
        })
    ]
    const rendererConfig = {
        output,
        target: 'electron-renderer',
        resolve,
        mode,
        optimization,
        module: webpackModule,
        devServer: {
            disableHostCheck: true,
            contentBase: path.join(__dirname),
            host: '0.0.0.0',
            port: RENDERER_SERVER_PORT,
            writeToDisk: true,
        },
        externals: {
            fs: 'commonjs fs',
            path: 'commonjs path',
            os: 'commonjs os',
            process: 'commonjs process',
            electron: 'commonjs electron',
        },
    }

    function appConfig(name, fileType, packageJSON) {
        const entry = {
            [name]: {
                import: `./src/applications/${name}/views/index.${fileType}`,
                filename: `${name}/[name].js`,
            },
            [`${name}-preload`]: {
                import: `./src/applications/${name}/preload.ts`,
                filename: `${name}/preload.js`,
            },
        }
        const plugins = [
            new HtmlWebpackPlugin({
                template: path.resolve(__dirname, `./src/applications/${name}/views/index.html`),
                filename: `${name}/index.html`,
                chunks: [name]
            }),
        ]
        if (packageJSON) {
            plugins.push(new CopyWebpackPlugin({
                patterns: [
                    {
                        from: `./src/applications/${name}/package.json`,
                        to: `${name}/package.json`,
                    },
                ]
            }))
        }
        return { entry, plugins }
    }

    const flowrPhoneConfig = appConfig('FlowrPhone', 'tsx', true)
    const keyboardConfig = appConfig('keyboard', 'ts')

    return {
        ...rendererConfig,
        entry: {
            ...baseEntry,
            ...flowrPhoneConfig.entry,
            ...keyboardConfig.entry,
        },
        plugins: [
            ...basePlugins,
            ...flowrPhoneConfig.plugins,
            ...keyboardConfig.plugins,
        ]
    }
}
