import type { H3Event } from 'h3'

export async function getServiceRoleClient(event: H3Event) {
  const { serverSupabaseServiceRole } = await import('#supabase/server')
  return serverSupabaseServiceRole(event)
}
