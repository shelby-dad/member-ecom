import type { H3Event } from 'h3'
import pino from 'pino'

const appEnv = process.env.NUXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development'

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    service: 'single-tenant-shop',
    env: appEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  redact: {
    paths: [
      'headers.authorization',
      'headers.cookie',
      'authorization',
      'cookie',
      '*.authorization',
      '*.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.service_role_key',
      '*.smtp_password',
      '*.smtp_password_iv',
      '*.smtp_password_content',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
})

export function getBaseLogger() {
  return baseLogger
}

export function setEventRequestContext(event: H3Event, requestId: string) {
  const method = event.node.req.method || 'GET'
  const url = event.node.req.url || '/'
  event.context.requestId = requestId
  event.context.logger = baseLogger.child({
    request_id: requestId,
    method,
    url,
  })
}

export function getEventLogger(event: H3Event) {
  return event.context.logger || baseLogger
}

export function toErrorObject(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    message: String(error ?? ''),
  }
}
