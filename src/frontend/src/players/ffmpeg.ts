import * as Ffmpeg from '@taktik/fluent-ffmpeg'
import * as ffmpegPath from 'ffmpeg-static'
import { Readable } from 'stream'
import { resolve } from 'path'
import { app } from 'electron'
import { PlayerError, PlayerErrors } from './playerError'
import { getLogger } from '../logging/loggers'
import Mp4Parser from './parsers/mp4'
import SimpleParser from './parsers/simple'

import type { FfmpegCommandResponse, FfmpegPipelinesParams } from './types'
import type { IOutputParser } from './parsers/types'

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

const log = getLogger('FlowrFfmpeg')

Ffmpeg.setFfmpegPath(resolve(app.getAppPath(), ffmpegPath))

enum OutputFormat {
  MP4 = 'mp4',
  MP3 = 'mp3',
}

function getOutputParserForFormat(format: OutputFormat): IOutputParser | undefined {
  switch (format) {
    case OutputFormat.MP4:
      return new Mp4Parser()
    default:
      return new SimpleParser()
  }
}

function ffmpegCommandResponse(command: Ffmpeg.FfmpegCommand, format: OutputFormat): FfmpegCommandResponse {
  return {
    command: command.format(format),
    parser: getOutputParserForFormat(format),
  }
}

function getAudioMpegtsPipeline(
  input: string | Readable,
  errorHandler: (error: PlayerError) => void,
): FfmpegCommandResponse {
  const command = Ffmpeg(input, { logger: log })
    .on('start', (commandLine: string) => {
      log.info('Spawned Ffmpeg with command:', commandLine)
    })
    .on('error', handleError(errorHandler))

  return ffmpegCommandResponse(command, OutputFormat.MP3)
}

function getVideoPipeline({
  input,
  audioPid,
  subtitlesPid,
  deinterlace = false,
  errorHandler,
}: FfmpegPipelinesParams): FfmpegCommandResponse {
  const audioStreamSelector = audioPid ? `i:${audioPid}` : '0:a:0'
  const command = Ffmpeg(input, { logger: log })
    .inputOptions('-probesize 1000k')
    .outputOption('-preset ultrafast')
    .outputOption('-tune zerolatency')
    .outputOption('-g 30')
    .outputOption('-r 30')
    .outputOption(`-map ${audioStreamSelector}?`)
    .outputOption('-async 1')

  if (subtitlesPid) {
    const deinterlacingFilter = deinterlace ? ',yadif' : ''

    command
      .outputOption(`-filter_complex [0:v][i:${subtitlesPid}]overlay${deinterlacingFilter}[v]`)
      .outputOption('-map [v]')
  } else {
    if (deinterlace) {
      command.videoFilter('yadif')
    }

    command.outputOption('-map 0:v')
  }

  if (process.platform !== 'darwin') {
    command.outputOption('-flush_packets -1')
  }

  command
    .outputOption(
      '-movflags empty_moov+frag_keyframe+default_base_moof+disable_chpl',
    )
    .outputOption('-c:v libx264')
    .on('start', (commandLine: string) => {
      log.info('Spawned Ffmpeg with command: ', commandLine)
    })
    .on('error', handleError(errorHandler))

  return ffmpegCommandResponse(command, OutputFormat.MP4)
}

export {
  getAudioMpegtsPipeline,
  getVideoPipeline,
}
