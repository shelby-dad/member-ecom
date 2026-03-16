import { z } from 'zod'
import { getProfileOrThrow, requireRoles, type AppRole } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { canCreateRole } from '~/server/utils/user-management'

const bodySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().trim().min(1).max(120).optional().nullable(),
  role: z.enum(['admin', 'staff', 'member']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const userId = getRouterParam(event, 'id')
  if (!userId)
    throw createError({ statusCode: 400, message: 'Missing user id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const actorRole = profile.role as AppRole
  const supabase = await getServiceRoleClient(event)

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single()
  if (targetError)
    throw createError({ statusCode: 500, message: targetError.message })
  if (!target)
    throw createError({ statusCode: 404, message: 'User not found' })

  const targetRole = target.role as AppRole
  if (!canCreateRole(actorRole, targetRole))
    throw createError({ statusCode: 403, message: `You cannot manage accounts with role '${targetRole}'.` })

  if (parsed.data.role && !canCreateRole(actorRole, parsed.data.role as AppRole))
    throw createError({ statusCode: 403, message: `You cannot assign role '${parsed.data.role}'.` })

  const email = parsed.data.email?.trim().toLowerCase()
  const authUpdates: Record<string, unknown> = {}
  if (email)
    authUpdates.email = email
  if (parsed.data.password)
    authUpdates.password = parsed.data.password
  if (parsed.data.full_name !== undefined)
    authUpdates.user_metadata = { full_name: parsed.data.full_name?.trim() || null }

  if (Object.keys(authUpdates).length) {
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates)
    if (authError)
      throw createError({ statusCode: 400, message: authError.message })
  }

  const profileUpdates: Record<string, unknown> = {}
  if (email)
    profileUpdates.email = email
  if (parsed.data.full_name !== undefined)
    profileUpdates.full_name = parsed.data.full_name?.trim() || null
  if (parsed.data.role !== undefined)
    profileUpdates.role = parsed.data.role
  if (parsed.data.status !== undefined)
    profileUpdates.status = parsed.data.status

  if (Object.keys(profileUpdates).length) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
    if (updateError)
      throw createError({ statusCode: 500, message: updateError.message })
  }

  const { data: updated, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, wallet_balance, created_at')
    .eq('id', userId)
    .single()
  if (fetchError)
    throw createError({ statusCode: 500, message: fetchError.message })

  return updated
})
