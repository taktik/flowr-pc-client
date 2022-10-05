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
} = require('./webpack/utils')

function reactAppConfig(name, mainEntryPath, extraEntries) {
    const filename = `${name}.html`
    const entry = {
        [name]: mainEntryPath,
        ...extraEntries,
    }
    const plugins = [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, `static/pages/${filename}`),
            filename,
            chunks: [name],
        }),
    ]
    return { entry, filename, plugins }
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

module.exports = (env) => {
    const mode = env?.production ? Mode.PRODUCTION : Mode.DEVELOPMENT
    const optimization = getOptimization(mode)

    const {
        entry: appEntry,
        plugins: appPlugins,
        filename: appFilename,
    } = reactAppConfig('app', './src/wexond/renderer/app/index.tsx', {
        'view-preload': './src/wexond/preloads/view-preload.ts',
    })
    const {
        entry: configEntry,
        plugins: configPlugins,
        filename: configFilename,
    } = reactAppConfig('config', './src/config/index.tsx', { 'config-preload': './src/config/preload.ts' })

    const baseEntry = {
        exportNode: './src/frontend/preloads/exportNode.ts',
        'inactivity-preload': './src/inactivity/preload.ts',
        ...appEntry,
        ...configEntry,
    }

    const fileNamesToFilter = [appFilename, configFilename]
    const basePlugins = [
        ...appPlugins,
        ...configPlugins,
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: './static/pages',
                    filter: (path) => {
                        // We must not emit app.html that is handled by the HtmlWebpackPlugin above
                        // ... otherwise an error is thrown
                        return !fileNamesToFilter.some(name => path.endsWith(name))
                    }
                },
            ]
        })
    ]

    const flowrPhoneConfig = appConfig('FlowrPhone', 'tsx', true)
    const keyboardConfig = appConfig('keyboard', 'ts')

    return {
        output,
        target: 'electron-renderer',
        resolve,
        mode,
        optimization,
        module: webpackModule,
        externals: {
            fs: 'commonjs fs',
            path: 'commonjs path',
            os: 'commonjs os',
            process: 'commonjs process',
            electron: 'commonjs electron',
        },
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
