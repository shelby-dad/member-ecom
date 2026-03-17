import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const supabase = await getServiceRoleClient(event)
  const [countriesRes, statesRes, citiesRes] = await Promise.all([
    supabase.from('countries').select('id, code, name').eq('is_active', true).order('name'),
    supabase.from('states').select('id, country_id, code, name').eq('is_active', true).order('name'),
    supabase.from('cities').select('id, country_id, state_id, name').eq('is_active', true).order('name'),
  ])

  if (countriesRes.error)
    throw createError({ statusCode: 500, message: countriesRes.error.message })
  if (statesRes.error)
    throw createError({ statusCode: 500, message: statesRes.error.message })
  if (citiesRes.error)
    throw createError({ statusCode: 500, message: citiesRes.error.message })

  return {
    countries: countriesRes.data ?? [],
    states: statesRes.data ?? [],
    cities: citiesRes.data ?? [],
  }
})
