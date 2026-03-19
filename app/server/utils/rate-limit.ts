import { createError, getHeader, getRequestIP, setHeader, type H3Event } from 'h3'

interface RateLimitState {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  bucket: string
  limit: number
  windowMs: number
  scope?: string | null
}

const store = new Map<string, RateLimitState>()

export function resetRateLimitStoreForTest() {
  store.clear()
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const existing = store.get(key)
  if (!existing || now >= existing.resetAt) {
    const next: RateLimitState = { count: 1, resetAt: now + windowMs }
    store.set(key, next)
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: next.resetAt,
      retryAfterSeconds: 0,
    }
  }

  existing.count += 1
  store.set(key, existing)
  const allowed = existing.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

function getClientId(event: H3Event) {
  const ip = getRequestIP(event, { xForwardedFor: true })
    || getHeader(event, 'x-real-ip')
    || 'unknown'
  return String(ip).trim() || 'unknown'
}

export function enforceRateLimit(event: H3Event, options: RateLimitOptions) {
  const scope = String(options.scope ?? '').trim() || getClientId(event)
  const key = `${options.bucket}:${scope}`
  const result = checkRateLimit(key, options.limit, options.windowMs)

  setHeader(event, 'X-RateLimit-Limit', String(options.limit))
  setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
  setHeader(event, 'X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)))

  if (!result.allowed) {
    setHeader(event, 'Retry-After', result.retryAfterSeconds)
    throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
  }
}
