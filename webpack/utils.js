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
        '~': path.resolve(__dirname, '../src/wexond'),
        'src': path.resolve(__dirname, '../src'),
    }
}

const webpackModule = {
    rules: [
        {
            test: /\.ejs$/,
            type: 'asset/source',
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
            type: 'asset/inline',
        },
        {
            test: /\.(eot|svg|ttf|woff|woff2|otf)$/i,
            type: 'asset/resource',
        },
        {
            test: /\.node$/,
            type: 'asset/resource',
        },
    ],
}

const output = {
    path: path.resolve(__dirname, `../${OUTPUT_DIR}`),
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
    cleanDir,
    deleteDir,
    deleteFile,
    getOptimization,
    Mode,
    output,
    OUTPUT_DIR,
    preload,
    RENDERER_SERVER_PORT,
    resolve,
    webpackModule,
}
