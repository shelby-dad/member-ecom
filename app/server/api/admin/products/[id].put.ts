import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const optionSetSchema = z.object({ name: z.string().min(1), values: z.array(z.string().min(1)).min(1) })
const bodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  has_variants: z.boolean().optional(),
  option_sets: z.array(optionSetSchema).optional(),
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

  const supabase = await getServiceRoleClient(event)
  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.slug !== undefined) updates.slug = parsed.data.slug
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active
  if (parsed.data.has_variants !== undefined) updates.has_variants = parsed.data.has_variants
  if (parsed.data.option_sets !== undefined) updates.option_sets = parsed.data.option_sets

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
