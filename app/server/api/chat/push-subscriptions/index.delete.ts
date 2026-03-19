import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { error } = await supabase
    .from('chat_push_subscriptions')
    .delete()
    .eq('user_id', profile.id)
    .eq('endpoint', parsed.data.endpoint)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
