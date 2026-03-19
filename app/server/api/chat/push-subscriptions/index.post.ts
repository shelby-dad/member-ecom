import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(1024),
    auth: z.string().min(8).max(1024),
  }),
  user_agent: z.string().max(1024).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const payload = parsed.data

  const { data, error } = await supabase
    .from('chat_push_subscriptions')
    .upsert({
      endpoint: payload.endpoint,
      user_id: profile.id,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      user_agent: payload.user_agent ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    .select('id, user_id, endpoint, is_active, updated_at')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to save push subscription.' })

  return { item: data }
})
