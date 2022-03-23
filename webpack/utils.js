/* eslint-disable */

const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const fs = require('fs')

const Mode = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production'
}

const OUTPUT_DIR = './build'
const RENDERER_SERVER_PORT = 4444

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

function getOptimization(mode) {
    return mode === Mode.PRODUCTION ? {
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
}

const resolve = {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.html', '.node'],
    alias: {
        '~': path.resolve(__dirname, '../src/wexond')
    }
}

const webpackModule = {
    rules: [
        {
            // If you see a file that ends in .ejs, just send it to the raw-loader.
            test: /\.ejs$/,
            use: 'raw-loader',
        },
        {
            test: /\.html$/,
            use: 'html-loader',
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

const publicPath =  path.resolve(__dirname, `../${OUTPUT_DIR}`)

const output = {
    path: publicPath,
    publicPath,
}

function preload(name, path, mode, optimization) {
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

module.exports = {
    Mode,
    OUTPUT_DIR,
    resolve,
    webpackModule,
    output,
    deleteFile,
    cleanDir,
    deleteDir,
    getOptimization,
    preload,
    RENDERER_SERVER_PORT,
}
