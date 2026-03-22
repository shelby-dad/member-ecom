import type { H3Event } from 'h3'
import { getRequestHeader, getRequestIP, getRequestURL, setHeader } from 'h3'
import { setEventRequestContext, getEventLogger } from '~/server/utils/logger'

function readOrCreateRequestId(event: H3Event) {
  const incoming = String(getRequestHeader(event, 'x-request-id') || '').trim()
  if (incoming)
    return incoming
  return crypto.randomUUID()
}

export default defineEventHandler((event) => {
  const requestId = readOrCreateRequestId(event)
  setHeader(event, 'x-request-id', requestId)
  setEventRequestContext(event, requestId)

  const logger = getEventLogger(event)
  const startedAt = Date.now()
  const url = getRequestURL(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const userAgent = String(getRequestHeader(event, 'user-agent') || '')

  logger.info({
    event: 'request.start',
    method: event.node.req.method || 'GET',
    path: url.pathname,
    query: url.search || '',
    ip,
    user_agent: userAgent || null,
  }, 'Incoming request')

  let ended = false
  const logEnd = (eventName: 'request.finish' | 'request.close') => {
    if (ended)
      return
    ended = true
    logger.info({
      event: eventName,
      status_code: Number(event.node.res.statusCode || 200),
      duration_ms: Math.max(0, Date.now() - startedAt),
      content_length: String(event.node.res.getHeader('content-length') || ''),
    }, 'Request completed')
  }

  event.node.res.on('finish', () => logEnd('request.finish'))
  event.node.res.on('close', () => logEnd('request.close'))
})
