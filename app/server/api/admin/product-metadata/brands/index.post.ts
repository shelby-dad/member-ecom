import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  image_path: z.string().optional().nullable(),
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
  const slug = parsed.data.slug?.trim() || parsed.data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase
    .from('brands')
    .insert({
      name: parsed.data.name.trim(),
      slug,
      image_path: parsed.data.image_path?.trim() || null,
      is_active: parsed.data.is_active,
    })
    .select('*')
    .single()
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})

