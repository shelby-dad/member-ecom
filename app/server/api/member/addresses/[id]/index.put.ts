import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  line1: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional().nullable(),
  country_id: z.string().uuid(),
  state_id: z.string().uuid(),
  city_id: z.string().uuid(),
  postal_code: z.string().trim().max(32).optional().nullable(),
  is_default: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing address id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const [{ data: country }, { data: state }, { data: city }] = await Promise.all([
    supabase.from('countries').select('id, name').eq('id', parsed.data.country_id).eq('is_active', true).maybeSingle(),
    supabase.from('states').select('id, name, country_id').eq('id', parsed.data.state_id).eq('is_active', true).maybeSingle(),
    supabase.from('cities').select('id, name, state_id, country_id').eq('id', parsed.data.city_id).eq('is_active', true).maybeSingle(),
  ])
  if (!country || !state || !city)
    throw createError({ statusCode: 400, message: 'Invalid country/region/township selection.' })
  if (state.country_id !== country.id || city.state_id !== state.id || city.country_id !== country.id)
    throw createError({ statusCode: 400, message: 'Country/region/township relationship is invalid.' })

  const payload = {
    label: parsed.data.label?.trim() || null,
    line1: parsed.data.line1,
    line2: parsed.data.line2?.trim() || null,
    city: city.name,
    state: state.name,
    postal_code: parsed.data.postal_code?.trim() || null,
    country: country.name,
    country_id: country.id,
    state_id: state.id,
    city_id: city.id,
    is_default: parsed.data.is_default,
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(payload)
    .eq('id', id)
    .eq('user_id', profile.id)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data
})
