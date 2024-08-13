import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import {join, resolve} from 'path'
import { BeIDDataHandler } from './beid-message-handler'
import {app, WebContents} from "electron";
import {platform} from "os";
import * as log from "electron-log";

// Event to handle
// on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
// on(event: 'disconnect', listener: () => void): this;
// on(event: 'error', listener: (err: Error) => void): this;
// on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
// on(event: 'message', listener: (message: Serializable, sendHandle: SendHandle) => void): this;
// on(event: 'spawn', listener: () => void): this;

//  TODO: Add missing handlers
class BeIDProcessHandler {
    private static instance: BeIDProcessHandler | undefined = undefined

    static getInstance(fileName: string, webContents: WebContents): BeIDProcessHandler {
        if (!this.instance) {
            this.instance = new BeIDProcessHandler(fileName, webContents)
            this.instance.start(webContents)
        }
        return this.instance
    }

    private executablePath: string
    private webContents: WebContents
    private childProcessReference: ChildProcessWithoutNullStreams | undefined

    private messageHandler: BeIDDataHandler = BeIDDataHandler.getInstance()

    private childProcessStandardOutputHandler: (data: any) => void = (data: any) => {
        this.messageHandler.handleMessage(data.toString())
    }

    private childProcessStandardErrorHandler: (data: any) => void = (data: any) => {
        this.messageHandler.handleMessage(data.toString())
    }

    private childProcessExitHandler: (exitCode?: any) => void = (exitCode: any) => {
        console.log(`BeIDProcess exit with code ${exitCode}`)
        this.messageHandler.handleMessage('')
        //this.start()  //  TODO: Implement a better retry logic
    }

    private start(webContents: WebContents) {
        try {
            this.childProcessReference = spawn(this.executablePath)
            this.messageHandler.webContents = webContents
            this.childProcessReference.stdout.on('data', this.childProcessStandardOutputHandler)
            this.childProcessReference.stderr.on('data', this.childProcessStandardErrorHandler)
            this.childProcessReference.on('exit', this.childProcessExitHandler)
            this.childProcessReference.on('close', this.childProcessExitHandler)
        } catch (err) {
            log.error(err)
        }

    }

    private constructor(path: string, webContents: WebContents) {
        this.executablePath = path
        this.webContents = webContents
        console.log(this.executablePath)
    }
}

let handler: BeIDProcessHandler

const computeExecutablePath = () => {
    const fileName = platform() === 'win32' ? 'beid_reader.exe': 'beid_reader'
    if (process.env.ENV === 'dev') {
        return join(app.getAppPath(), `script/beid/${fileName}`)
    }
    return resolve(app.getAppPath(), `script/beid/${fileName}`)
}

const init = (webContents: WebContents ) => {
    handler = BeIDProcessHandler.getInstance(computeExecutablePath(), webContents)
}

const getHandler = () => {
    return handler
}

export { getHandler, init }
