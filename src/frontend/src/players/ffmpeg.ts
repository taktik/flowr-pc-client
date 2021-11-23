import * as Ffmpeg from 'fluent-ffmpeg'
import * as ffmpegPath from 'ffmpeg-static'
import { path as ffprobePath } from 'ffprobe-static'
import { Readable } from 'stream'
import { resolve } from 'path'
import { app } from 'electron'
import { PlayerError, PlayerErrors } from './playerError'
import { getLogger } from '../logging/loggers'

function appendCmdWithoutSubtitle(
  ffmpegCmd: Ffmpeg.FfmpegCommand,
  videoStream: number,
  audioStream: number,
): void {
  if (audioStream && audioStream > -1) {
    ffmpegCmd.outputOptions([`-map 0:${videoStream}`, `-map 0:${audioStream}?`])
  } else {
    ffmpegCmd.input('anullsrc').inputFormat('lavfi')
  }
}

function appendCmdWithSubtitle(
  ffmpegCmd: Ffmpeg.FfmpegCommand,
  audioStream: number,
  subtitleStream: number,
): void {
  // TODO: how to add yadif to -filter_complex ? Currently, we don't find a way to do interlacing + subtitles
  const filterComplex = `-filter_complex [0:v][0:${subtitleStream}]overlay[v]`
  ffmpegCmd.outputOptions([filterComplex, '-map [v]', `-map 0:${audioStream}?`])
}

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
    } else if (message.includes('SIGKILL') || message.includes('SIGTERM')) {
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
  errorHandler(error: PlayerError): void,
}

const log = getLogger('FlowrFfmpeg')

export class FlowrFfmpeg {
  constructor() {
    Ffmpeg.setFfmpegPath(resolve(app.getAppPath(), ffmpegPath))
    Ffmpeg.setFfprobePath(resolve(app.getAppPath(), ffprobePath))
  }

  async ffprobe(
    input?: string | Readable,
    options?: Ffmpeg.FfmpegCommandOptions,
  ): Promise<Ffmpeg.FfprobeResponse> {
    return Ffmpeg(input, options).ffprobeProcess()
  }

  getVideoMpegtsPipeline(
    input: string | Readable,
    videoStream: number,
    audioStream = -1,
    subtitleStream = -1,
    isDeinterlacingEnabled: boolean,
    errorHandler: (error: PlayerError) => void,
  ): Ffmpeg.FfmpegCommand {
    if (process.platform === 'darwin' && !(input instanceof Readable)) {
      input +=
        '?fifo_size=1880000&overrun_nonfatal=1&buffer_size=/1880000&pkt_size=188'
    }

    const ffmpegCmd = Ffmpeg(input)
      .inputOptions('-probesize 1000k')
      .inputOptions('-flags low_delay')
      .outputOptions('-preset ultrafast')
      .outputOptions('-tune zerolatency')
      .outputOptions('-g 30')
      .outputOptions('-r 30')

    if (subtitleStream && subtitleStream > -1) {
      log.info('-------- appendCmdWithSubtitle')
      appendCmdWithSubtitle(ffmpegCmd, audioStream, subtitleStream)
    } else {
      log.info('-------- appendCmdWithoutSubtitle')
      appendCmdWithoutSubtitle(
        ffmpegCmd,
        videoStream,
        audioStream,
      )
    }

    if (process.platform !== 'darwin') {
      ffmpegCmd.outputOptions('-flush_packets -1')
    }

    return ffmpegCmd
      .format('mp4')
      .outputOptions(
        '-movflags empty_moov+frag_keyframe+default_base_moof+disable_chpl',
      )
      .outputOption('-frag_duration 2200000')
      .outputOption('-c:v copy')
      .on('start', commandLine => {
        log.info('Spawned Ffmpeg with command: ', commandLine)
      })
      .on('error', handleError(errorHandler))
  }

  getAudioMpegtsPipeline(
    input: string | Readable,
    errorHandler: (error: PlayerError) => void,
  ): Ffmpeg.FfmpegCommand {
    return Ffmpeg(input)
      .format('mp3')
      .on('start', commandLine => {
        log.info('Spawned Ffmpeg with command:', commandLine)
      })
      .on('error', handleError(errorHandler))
  }

  getVideoPipelineWithSubtitles({
    input,
    audioPid,
    subtitlesPid,
    errorHandler,
  }: FfmpegPipelinesParams): Ffmpeg.FfmpegCommand {
    const audioStreamSelector = audioPid ? `i:${audioPid}` : '0:a:0'
    const ffmpegCmd = Ffmpeg(input)
      .inputOptions('-probesize 1000k')
      .inputOptions('-flags low_delay')
      .outputOption('-preset ultrafast')
      .outputOption('-tune zerolatency')
      .outputOption('-g 30')
      .outputOption('-r 30')
      .outputOption(`-map ${audioStreamSelector}?`)

    if (subtitlesPid) {
      ffmpegCmd
        .outputOption(`-filter_complex [0:v][i:${subtitlesPid}]overlay[v]`)
        .outputOption('-map [v]')
    } else {
      ffmpegCmd
        .outputOption('-map 0:v')
        .outputOption('-c:v copy')
    }

    if (process.platform !== 'darwin') {
      ffmpegCmd.outputOption('-flush_packets -1')
    }

    return ffmpegCmd
      .format('mp4')
      .outputOption(
        '-movflags empty_moov+frag_keyframe+default_base_moof+disable_chpl',
      )
      .on('start', commandLine => {
        log.info('Spawned Ffmpeg with command: ', commandLine)
      })
      .on('error', handleError(errorHandler))
  }
}
