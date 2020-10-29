
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const fs = require('fs')

const OUTPUT_DIR = './build'

function deleteFile(path) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, err => {
            if (err) {
                return reject(err)
            }
            resolve()
        })
    })
}

function cleanDir(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, { withFileTypes: true }, (err, files) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return resolve()
                }
                return reject(err)
            }
            Promise.all(files.map(file => {
                const filePath = `${path}/${file.name}`
                return file.isDirectory() ? deleteDir(filePath) : deleteFile(filePath)
            }))
                .then(resolve)
                .catch(reject)
        })
    })
}

async function deleteDir(path) {
    await cleanDir(path)
    return new Promise((resolve, reject) => {
        fs.rmdir(path, err => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return resolve()
                }
                return reject(err)
            }
            resolve()
        })
    })
}

module.exports = async (env, argv) => {
    await deleteDir(OUTPUT_DIR)

    const entries = []
    const optimization = argv.mode === 'production' ? {
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						compress: {
							join_vars: false,
							sequences: false,
						},
					},
				}),
			],
        }
        : {}

    const resolve = {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.html', '.node'],
        alias: {
            '~': path.resolve(__dirname, './src/wexond')
        }
    }

    const module = {
        rules: [
            // {
            //     // If you see a file that ends in .js, just send it to the babel-loader.
            //     test: /\.(js|jsx)$/,
            //     use: {
            //         loader: 'babel-loader',
            //     },
            //     exclude: /node_modules\//,
            // },
            {
                // If you see a file that ends in .ejs, just send it to the raw-loader.
                test: /\.ejs$/,
                use: 'raw-loader',
            },
            {
                test: /\.(ts|tsx)$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            experimentalWatchApi: true,
                        },
                    },
                ],
            },
            {
                test: /\.css/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|otf)$/i,
                loader: 'file-loader',
            },
            {
                test: /\.node$/,
                use: 'file-loader',
            },
        ],
    }

    const output = {
        path: path.resolve(__dirname, OUTPUT_DIR),
    }

    function appOutput(name) {
        return {
            path: path.resolve(__dirname, `${OUTPUT_DIR}/${name}`),
            publicPath: `/${name}/`
        }
    }

    const mode = 'development'

    const wexondMain = {
        entry: { main: './src/launcher/index.ts' },
        output,
        target: 'electron-main',
        resolve,
        mode,
        optimization,
        module,
        plugins: [],
        externals: {
            fs: 'commonjs fs',
            path: 'commonjs path',
            os: 'commonjs os',
            process: 'commonjs process',
            leveldown: 'commonjs leveldown',
        },
    }
    const wexondRenderer = {
        entry: { app: './src/wexond/renderer/app/index.tsx' },
        output,
        target: 'electron-renderer',
        resolve,
        mode,
        optimization,
        module,
        plugins: [
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
    }

    function preload(name, path) {
        return {
            entry: {
                [name]: path
            },
            output,
            target: 'electron-preload',
            resolve,
            mode,
            optimization,
            module,
        }
    }
    const frontendPreload = preload('exportNode', './src/frontend/preloads/exportNode.ts')
    const viewPreload = preload('view-preload', './src/wexond/preloads/view-preload.ts')
    const backgroundPreload = preload('background-preload', './src/wexond/preloads/background-preload.ts')

    function addApp(name, fileType) {
        const renderer = {
            entry: {
                [name]: `./src/applications/${name}/views/index.${fileType}`
            },
            output: appOutput(name),
            target: 'electron-renderer',
            resolve,
            mode,
            optimization,
            module,
            plugins: [
                new HtmlWebpackPlugin({
                    template: path.resolve(__dirname, `./src/applications/${name}/views/index.html`),
                    filename: `index.html`,
                    chunks: [name]
                }),
            ]
        }

        const preload = {
            entry: {
                preload: `./src/applications/${name}/preload.ts`
            },
            output: appOutput(name),
            target: 'electron-preload',
            resolve,
            mode,
            optimization,
            module,
        }

        entries.push(renderer, preload)
    }
    
    entries.push(
        wexondMain,
        wexondRenderer,
        viewPreload,
        backgroundPreload,
        frontendPreload,
    )
    addApp('FlowrPhone', 'tsx')
    addApp('keyboard', 'ts')

	return entries
}
