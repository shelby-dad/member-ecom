import { processMemberPurchaseNotifyQueue } from '~/server/services/queues/member-purchase-notify-queue'
import { processUserCreatedNotifyQueue } from '~/server/services/queues/user-created-notify-queue'
import { getEventLogger, toErrorObject } from '~/server/utils/logger'

let isRunning = false
let lastRunAt = 0

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const config = useRuntimeConfig(event)
    const intervalMs = Math.max(5000, Number(config.queuePollIntervalMs ?? 15000) || 15000)
    const now = Date.now()

    if (isRunning)
      return
    if (now - lastRunAt < intervalMs)
      return

    const path = event.node.req.url || ''
    if (path.startsWith('/api/internal/jobs/user-created-notify/process') || path.startsWith('/api/internal/jobs/member-purchase-notify/process'))
      return

    lastRunAt = now
    isRunning = true
    void Promise.allSettled([
      processUserCreatedNotifyQueue(event, { limit: 10 }),
      processMemberPurchaseNotifyQueue(event, { limit: 10 }),
    ])
      .then((results) => {
        const rejected = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
        if (!rejected.length)
          return
        const logger = getEventLogger(event)
        for (const failure of rejected) {
          logger.error({
            event: 'job_queue.process_failed',
            error: toErrorObject(failure.reason),
          }, 'Background queue processor failed')
        }
      })
      .finally(() => {
        isRunning = false
      })
  })
})
