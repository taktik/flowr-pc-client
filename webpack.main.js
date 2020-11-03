const { getOptimization, webpackModule, resolve, Mode, output, deleteDir, OUTPUT_DIR } = require('./webpack/utils')

module.exports = async (env) => {
    await deleteDir(OUTPUT_DIR)

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
            plugins: [],
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