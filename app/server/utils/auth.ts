import type { H3Event } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export type AppRole = 'superadmin' | 'admin' | 'member' | 'staff'

export async function getProfileOrThrow(event: H3Event): Promise<{ id: string; role: string }> {
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
  return data as { id: string; role: string }
}

export function requireRoles(profile: { role: string }, allowed: AppRole[]) {
  if (!allowed.includes(profile.role as AppRole))
    throw createError({ statusCode: 403, message: 'Forbidden' })
}
