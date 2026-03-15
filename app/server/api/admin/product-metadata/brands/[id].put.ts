import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  image_path: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim()
  if (parsed.data.slug !== undefined) updates.slug = parsed.data.slug?.trim() || null
  if (parsed.data.image_path !== undefined) updates.image_path = parsed.data.image_path?.trim() || null
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})

