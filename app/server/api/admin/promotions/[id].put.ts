import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['fixed', 'percent']).optional(),
  discount_value: z.number().positive().optional(),
  min_subtotal: z.number().min(0).optional(),
  max_discount: z.number().min(0).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  usage_limit: z.number().int().positive().optional().nullable(),
  per_user_limit: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.code !== undefined) updates.code = parsed.data.code.trim().toUpperCase()
  if (parsed.data.description !== undefined) updates.description = parsed.data.description?.trim() || null

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('promotions')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
