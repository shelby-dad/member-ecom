import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  line1: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional().nullable(),
  postal_code: z.string().trim().max(32).optional().nullable(),
  country: z.string().trim().min(1).max(64).default('TH'),
  is_default: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const payload = {
    user_id: profile.id,
    label: parsed.data.label?.trim() || null,
    line1: parsed.data.line1,
    line2: parsed.data.line2?.trim() || null,
    city: parsed.data.city,
    state: parsed.data.state?.trim() || null,
    postal_code: parsed.data.postal_code?.trim() || null,
    country: parsed.data.country,
    is_default: parsed.data.is_default,
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert(payload)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data
})
