import { z } from 'zod'
import { processUserCreatedNotifyQueue } from '~/server/services/queues/user-created-notify-queue'

const bodySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const expected = String(config.internalQueueToken ?? '').trim()
  const incoming = String(getHeader(event, 'x-internal-queue-token') ?? '').trim()
  if (!expected)
    throw createError({ statusCode: 503, message: 'INTERNAL_QUEUE_TOKEN is not configured.' })
  if (!incoming || incoming !== expected)
    throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body ?? {})
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const summary = await processUserCreatedNotifyQueue(event, { limit: parsed.data.limit ?? 25 })
  return { ok: true, summary }
})
