import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(300),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase.rpc('search_pos_variants', {
    p_query: parsed.data.q?.trim() || null,
    p_limit: parsed.data.limit,
  })
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    track_stock: row.track_stock,
    products: {
      id: row.product_id,
      name: row.product_name,
      has_variants: row.product_has_variants,
      track_stock: row.product_track_stock,
      option_sets: row.product_option_sets,
    },
    relevance: Number(row.relevance ?? 0),
  }))
})

