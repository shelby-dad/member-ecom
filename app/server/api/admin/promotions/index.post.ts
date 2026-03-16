import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['fixed', 'percent']),
  discount_value: z.number().positive(),
  min_subtotal: z.number().min(0).optional().default(0),
  max_discount: z.number().min(0).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  usage_limit: z.number().int().positive().optional().nullable(),
  per_user_limit: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      ...parsed.data,
      code: parsed.data.code.trim().toUpperCase(),
      description: parsed.data.description?.trim() || null,
      created_by: profile.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
