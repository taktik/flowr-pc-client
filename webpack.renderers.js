const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const {
    webpackModule,
    getOptimization,
    output,
    resolve,
    Mode
} = require('./webpack/utils')

module.exports = (env) => {
    const mode = (env && env.production) ? Mode.PRODUCTION : Mode.DEVELOPMENT
    const optimization = getOptimization(mode)
    const baseEntry = {
        app: './src/wexond/renderer/app/index.tsx',
        exportNode: {
            import: './src/frontend/preloads/exportNode.ts',
        },
        'view-preload': {
            import: './src/wexond/preloads/view-preload.ts',
        },
        'background-preload': {
            import: './src/wexond/preloads/background-preload.ts',
        },
    }
    const basePlugins = [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'static/pages/app.html'),
            filename: 'app.html',
            chunks: ['app'],
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'static/pages/config.html'),
            filename: 'config.html',
        }),
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
            port: 4444,
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

    function appConfig(name, fileType) {
        const entry = {
            [name]: {
                import: `./src/applications/${name}/views/index.${fileType}`,
                filename: `${name}/[name].js`,
            },
            [`${name}-preload`]: {
                import: `./src/applications/${name}/preload.ts`,
                filename: `${name}/[name].js`,
            },
        }
        const plugins = [
            new HtmlWebpackPlugin({
                template: path.resolve(__dirname, `./src/applications/${name}/views/index.html`),
                filename: `${name}/index.html`,
                chunks: [name]
            }),
        ]
        return { entry, plugins }
    }

    const flowrPhoneConfig = appConfig('FlowrPhone', 'tsx')
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
