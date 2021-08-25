import { Appender, LogMetadata, LogSeverity } from '../../types'
import { ConsoleFunction } from './types'

export class ConsoleAppender implements Appender {
  static loggerFromLevel(level: LogSeverity): ConsoleFunction {
    switch (level) {
      case LogSeverity.DEBUG:
        return console.debug.bind(console)
      case LogSeverity.INFO:
        return console.info.bind(console)
      case LogSeverity.WARN:
        return console.warn.bind(console)
      case LogSeverity.ERROR:
        return console.error.bind(console)
      case LogSeverity.FATAL:
        return console.error.bind(console, '[FATAL]')
    }
  }

  log(data: LogMetadata): void {
    const logger = ConsoleAppender.loggerFromLevel(data.severity)
    logger(`[${data.date}]`, ...data.messages)
  }
}
