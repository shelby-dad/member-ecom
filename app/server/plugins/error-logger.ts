import { getBaseLogger, toErrorObject } from '~/server/utils/logger'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: unknown, context: any) => {
    const requestId = String(context?.event?.context?.requestId || '')
    const path = String(context?.event?.node?.req?.url || '')
    const method = String(context?.event?.node?.req?.method || '')
    const logger = requestId
      ? getBaseLogger().child({ request_id: requestId, method, url: path })
      : getBaseLogger()
    logger.error({
      event: 'request.error',
      error: toErrorObject(error),
    }, 'Unhandled server error')
  })
})
