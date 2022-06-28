type ConsoleArg = any[]

interface ILogger {
  readonly namespace: string
  debug: (...args: ConsoleArg) => void
  info: (...args: ConsoleArg) => void
  warn: (...args: ConsoleArg) => void
  error: (...args: ConsoleArg) => void
  fatal: (...args: ConsoleArg) => void
}

enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

const LogLevel: Map<LogSeverity, number> = new Map([
  [LogSeverity.DEBUG, 0],
  [LogSeverity.INFO, 1],
  [LogSeverity.WARN, 2],
  [LogSeverity.ERROR, 3],
  [LogSeverity.FATAL, 4],
])

function severityFromLevel(level: number): LogSeverity {
  return Array.from(LogLevel.entries()).find(([, l]) => l === level)?.[0] ?? LogSeverity.INFO
}

type LogLevelParam = number | LogSeverity

type LogMetadata = {
  date: string,
  messages: ConsoleArg,
  severity: LogSeverity,
}

interface Appender {
  log(data: LogMetadata): void
}

export {
  ConsoleArg,
  ILogger,
  LogSeverity,
  LogLevel,
  LogLevelParam,
  LogMetadata,
  Appender,
  severityFromLevel,
}
