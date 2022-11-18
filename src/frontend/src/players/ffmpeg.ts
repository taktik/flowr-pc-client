import * as Ffmpeg from '@taktik/fluent-ffmpeg'
import * as ffmpegPath from 'ffmpeg-static'
import { Readable } from 'stream'
import { resolve } from 'path'
import { app } from 'electron'
import { PlayerError, PlayerErrors } from './playerError'
import { getLogger } from '../logging/loggers'

function handleError(
  callback: (error: PlayerError) => void,
): (err: Error, stdout: string, stderr: string | undefined) => void {
  return (err, stdout, stderr) => {
    const message = `_________err ${new Date().toISOString()}: ${err.message}, ${stdout} ${stderr}`
    let playerError: PlayerErrors
    if (message.includes('Conversion failed')) {
      playerError = PlayerErrors.CONVERSION
    } else if (message.includes('Stream specifier')) {
      playerError = PlayerErrors.ERRONEOUS_STREAM
    } else if (message.includes('SIGKILL') || message.includes('SIGTERM') || message.includes('Exiting normally, received signal 15')) {
      playerError = PlayerErrors.TERMINATED
    } else {
      playerError = PlayerErrors.UNKNOWN
    }
    callback(new PlayerError(message, playerError))
  }
}

type FfmpegPipelinesParams = {
  input: Readable,
  audioPid?: number,
  subtitlesPid?: number,
  deinterlace?: boolean,
  errorHandler(error: PlayerError): void,
}

const log = getLogger('FlowrFfmpeg')

export class FlowrFfmpeg {
  constructor() {
    Ffmpeg.setFfmpegPath(resolve(app.getAppPath(), ffmpegPath))
  }

  getAudioMpegtsPipeline(
    input: string | Readable,
    errorHandler: (error: PlayerError) => void,
  ): Ffmpeg.FfmpegCommand {
    return Ffmpeg(input, { logger: log })
      .format('mp3')
      .on('start', (commandLine: string) => {
        log.info('Spawned Ffmpeg with command:', commandLine)
      })
      .on('error', handleError(errorHandler))
  }

  getVideoPipeline({
    input,
    audioPid,
    subtitlesPid,
    deinterlace = false,
    errorHandler,
  }: FfmpegPipelinesParams): Ffmpeg.FfmpegCommand {
    const audioStreamSelector = audioPid ? `i:${audioPid}` : '0:a:0'
    const ffmpegCmd = Ffmpeg(input, { logger: log })
      .inputOptions('-probesize 1000k')
      .outputOption('-preset ultrafast')
      .outputOption('-tune zerolatency')
      .outputOption('-g 30')
      .outputOption('-r 30')
      .outputOption(`-map ${audioStreamSelector}?`)

    if (subtitlesPid) {
      const deinterlacingFilter = deinterlace ? ',yadif' : ''

      ffmpegCmd
        .outputOption(`-filter_complex [0:v][i:${subtitlesPid}]overlay${deinterlacingFilter}[v]`)
        .outputOption('-map [v]')
    } else {
      if (deinterlace) {
        ffmpegCmd.videoFilter('yadif')
      }

      ffmpegCmd.outputOption('-map 0:v')
    }

    if (process.platform !== 'darwin') {
      ffmpegCmd.outputOption('-flush_packets -1')
    }

    return ffmpegCmd
      .format('mp4')
      .outputOption(
        '-movflags empty_moov+frag_keyframe+default_base_moof+disable_chpl',
      )
      .outputOption('-c:v libx264')
      .on('start', (commandLine: string) => {
        log.info('Spawned Ffmpeg with command: ', commandLine)
      })
      .on('error', handleError(errorHandler))
  }
}
