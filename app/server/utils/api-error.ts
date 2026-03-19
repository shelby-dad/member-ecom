import { createError, defineEventHandler, type EventHandler, type EventHandlerRequest } from 'h3'

function toStatusCode(value: unknown) {
  const n = Number(value ?? 500)
  if (!Number.isFinite(n))
    return 500
  return Math.min(599, Math.max(400, Math.trunc(n)))
}

export function normalizeApiError(error: unknown) {
  const statusCode = toStatusCode((error as any)?.statusCode ?? (error as any)?.status)
  const rawMessage = String((error as any)?.statusMessage || (error as any)?.message || '').trim()

  if (statusCode >= 500) {
    return createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Internal server error',
    })
  }

  const fallbackByStatus: Record<number, string> = {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    409: 'Conflict',
    422: 'Unprocessable entity',
    429: 'Too many requests. Please try again later.',
  }

  return createError({
    statusCode,
    message: rawMessage || fallbackByStatus[statusCode] || 'Request failed',
  })
}

export function defineSafeEventHandler<
  RequestT extends EventHandlerRequest = EventHandlerRequest,
  ResponseT = unknown,
>(handler: EventHandler<RequestT, ResponseT>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    }
    catch (error) {
      throw normalizeApiError(error)
    }
  })
}
