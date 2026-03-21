export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

export interface LogEnvelope {
  requestId?: string
  functionName?: string
  traceId?: string
  [key: string]: unknown
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  }
  console.log(JSON.stringify(payload))
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write('debug', message, context)
  },
  info(message: string, context?: LogContext) {
    write('info', message, context)
  },
  warn(message: string, context?: LogContext) {
    write('warn', message, context)
  },
  error(message: string, context?: LogContext) {
    write('error', message, context)
  },
  event(level: LogLevel, event: string, envelope: LogEnvelope = {}, data: LogContext = {}) {
    write(level, event, { ...envelope, ...data, event })
  },
}
