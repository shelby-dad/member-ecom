import { deleteCookie, getCookie, type H3Event } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { resolveEffectiveRole, type AppRole } from '~/utils/role-switch'
import { getServiceRoleClient } from '~/server/utils/supabase'

export type { AppRole }

export async function getProfileOrThrow(event: H3Event): Promise<{
  id: string
  role: AppRole
  baseRole: AppRole
  onBehalf?: { id: string; email: string; role: AppRole } | null
}> {
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

  const onBehalfUserId = getCookie(event, 'on-behalf-user-id')
  if (baseRole === 'superadmin' && onBehalfUserId) {
    const service = await getServiceRoleClient(event)
    const { data: target } = await service
      .from('profiles')
      .select('id, email, role')
      .eq('id', onBehalfUserId)
      .maybeSingle()

    if (target?.id) {
      const targetRole = target.role as AppRole
      return {
        id: target.id,
        role: targetRole,
        baseRole,
        onBehalf: {
          id: target.id,
          email: String(target.email ?? ''),
          role: targetRole,
        },
      }
    }

    deleteCookie(event, 'on-behalf-user-id', { path: '/' })
    deleteCookie(event, 'on-behalf-user-email', { path: '/' })
    deleteCookie(event, 'on-behalf-user-role', { path: '/' })
  }

  const requestedRole = getCookie(event, 'active-role')
  const role = resolveEffectiveRole(baseRole, requestedRole)

  return { id: data.id, role, baseRole, onBehalf: null }
}

export function requireRoles(profile: { role: string }, allowed: AppRole[]) {
  if (!allowed.includes(profile.role as AppRole))
    throw createError({ statusCode: 403, message: 'Forbidden' })
}
