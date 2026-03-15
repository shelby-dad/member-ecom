import { getCookie, type H3Event } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { resolveEffectiveRole, type AppRole } from '~/utils/role-switch'

export type { AppRole }

export async function getProfileOrThrow(event: H3Event): Promise<{ id: string; role: AppRole; baseRole: AppRole }> {
  const user = await serverSupabaseUser(event)
  if (!user?.id)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (error || !data)
    throw createError({ statusCode: 403, message: 'Forbidden' })

  const baseRole = data.role as AppRole
  const requestedRole = getCookie(event, 'active-role')
  const role = resolveEffectiveRole(baseRole, requestedRole)

  return { id: data.id, role, baseRole }
}

export function requireRoles(profile: { role: string }, allowed: AppRole[]) {
  if (!allowed.includes(profile.role as AppRole))
    throw createError({ statusCode: 403, message: 'Forbidden' })
}
