import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const page = parsed.data.page
  const perPage = parsed.data.per_page
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = await getServiceRoleClient(event)
  const { data, error, count } = await supabase
    .from('user_notifications')
    .select('id, kind, title, message, target_url, payload, is_read, read_at, created_at', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    per_page: perPage,
    has_more: (from + (data?.length ?? 0)) < Number(count ?? 0),
  }
})
