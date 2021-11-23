import { Appender, ConsoleArg, ILogger, LogLevel, LogLevelParam, LogSeverity } from './types'

abstract class AbstractLogger implements ILogger {
  abstract namespace: string
  private _level: number = LogLevel.get(LogSeverity.INFO)

  constructor(
    initLevel: LogLevelParam = LogSeverity.INFO,
    protected readonly appenders = new Set<Appender>(),
  ) {
    this.setLevel(initLevel)
  }

  private log(severity: LogSeverity, ...args: ConsoleArg) {
    const logLevel = LogLevel.get(severity)

    if (this._level > logLevel) {
      // silence this log
      return
    }

    const date = new Date().toISOString()

    this.appenders.forEach(appender => {
      // generate a new object each time to avoid accidental mutations in appenders
      appender.log({ severity, date, messages: [`[${this.namespace}]`, ...args] })
    })
  }

  getLevel(): number {
    return this._level
  }

  setLevel(value: LogLevelParam) {
    const level = typeof value === 'number' ? value : LogLevel.get(value)
    this._level = level
  }

  addAppender(appender: Appender) {
    this.appenders.add(appender)
  }

  removeAppender(appender: Appender) {
    this.appenders.delete(appender)
  }

  debug(...args: ConsoleArg) {
    this.log(LogSeverity.DEBUG, ...args)
  }

  info(...args: ConsoleArg) {
    this.log(LogSeverity.INFO, ...args)
  }

  warn(...args: ConsoleArg) {
    this.log(LogSeverity.WARN, ...args)
  }

  error(...args: ConsoleArg) {
    this.log(LogSeverity.ERROR, ...args)
  }

  fatal(...args: ConsoleArg) {
    this.log(LogSeverity.FATAL, ...args)
  }
}

class Logger extends AbstractLogger {
  constructor(
    readonly namespace: string,
    initLevel: LogLevelParam,
    appenders: Set<Appender>,
  ) {
    super(initLevel, appenders)
  }
}

class RootLogger extends AbstractLogger {
  private readonly loggers = new Map<string, Logger>()
  namespace = 'ROOT'

  /**
   * Function MUST be declared as a class property:
   *    it ensures correct scoping when exported
  */
  setLevel = (value: LogLevelParam) => {
    super.setLevel(value)
    this.loggers.forEach(logger => logger.setLevel(value))
  }

  /**
   * Function MUST be declared as a class property:
   *    it ensures correct scoping when exported
  */
  addAppender = (appender: Appender) => {
    super.addAppender(appender)
    this.loggers.forEach(logger => logger.addAppender(appender))
  }

  /**
   * Function MUST be declared as a class property:
   *    it ensures correct scoping when exported
  */
  removeAppender = (appender: Appender) => {
    super.removeAppender(appender)
    this.loggers.forEach(logger => logger.removeAppender(appender))
  }

  /**
   * Function MUST be declared as a class property:
   *    it ensures correct scoping when exported
  */
  getLogger = (namespace: string, severity: LogLevelParam = this.getLevel()): Logger => {
    let logger = this.loggers.get(namespace)

    if (!logger) {
      // shallow clone the appenders Set: each child logger should be able to have its own
      logger = new Logger(namespace, severity, new Set(this.appenders))
      this.loggers.set(namespace, logger)
    }
    return logger
  }
}

// eslint-disable-next-line @typescript-eslint/unbound-method
export const {
  getLogger,
  addAppender,
  removeAppender,
  setLevel,
  getLevel,
} = new RootLogger()
