import { z } from 'zod'
import { getProfileOrThrow, requireRoles, type AppRole } from '~/server/utils/auth'
import { buildPhoneCandidates, isSamePhone } from '~/server/utils/phone'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { canCreateRole } from '~/server/utils/user-management'

const bodySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().trim().min(1).max(120).optional().nullable(),
  avatar_url: z.string().trim().max(500).optional().nullable(),
  mobile_number: z.string().trim().max(32).optional().nullable(),
  is_mobile_logged_in: z.boolean().optional(),
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

  const nextRole = (parsed.data.role ?? target.role) as AppRole
  if (parsed.data.is_mobile_logged_in !== undefined && actorRole !== 'superadmin')
    throw createError({ statusCode: 403, message: 'Only superadmin can update mobile login flag.' })
  if (parsed.data.is_mobile_logged_in === true && nextRole !== 'member')
    throw createError({ statusCode: 400, message: 'Mobile login can only be enabled for member role.' })

  const email = parsed.data.email?.trim().toLowerCase()
  const mobileNumber = parsed.data.mobile_number?.trim() || ''
  if (parsed.data.mobile_number !== undefined && mobileNumber) {
    const candidates = buildPhoneCandidates(mobileNumber)
    let existingRows: Array<{ id: string; mobile_number: string | null }> = []
    if (candidates.length) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, mobile_number')
        .neq('id', userId)
        .in('mobile_number', candidates)
        .limit(20)
      if (error)
        throw createError({ statusCode: 500, message: error.message })
      existingRows = (data ?? []) as Array<{ id: string; mobile_number: string | null }>
    }
    if (!existingRows.some(row => isSamePhone(String(row.mobile_number ?? ''), mobileNumber))) {
      const digitsPattern = `%${mobileNumber.replace(/\D/g, '').split('').join('%')}%`
      if (digitsPattern !== '%%') {
        const { data: fuzzyRows, error: fuzzyErr } = await supabase
          .from('profiles')
          .select('id, mobile_number')
          .neq('id', userId)
          .ilike('mobile_number', digitsPattern)
          .limit(30)
        if (fuzzyErr)
          throw createError({ statusCode: 500, message: fuzzyErr.message })
        existingRows = [...existingRows, ...((fuzzyRows ?? []) as Array<{ id: string; mobile_number: string | null }>)]
      }
    }
    if (existingRows.some(row => isSamePhone(String(row.mobile_number ?? ''), mobileNumber))) {
      throw createError({
        statusCode: 400,
        message: 'Mobile number already exists. Please use another number.',
      })
    }
  }

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
  if (parsed.data.avatar_url !== undefined)
    profileUpdates.avatar_url = parsed.data.avatar_url?.trim() || null
  if (parsed.data.mobile_number !== undefined)
    profileUpdates.mobile_number = parsed.data.mobile_number?.trim() || null
  if (parsed.data.is_mobile_logged_in !== undefined) {
    profileUpdates.is_mobile_logged_in = nextRole === 'member'
      ? Boolean(parsed.data.is_mobile_logged_in)
      : false
  }
  if (parsed.data.role !== undefined)
    profileUpdates.role = parsed.data.role
  if (parsed.data.role !== undefined && parsed.data.role !== 'member')
    profileUpdates.is_mobile_logged_in = false
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
    .select('id, email, full_name, avatar_url, mobile_number, is_mobile_logged_in, role, status, wallet_balance, created_at')
    .eq('id', userId)
    .single()
  if (fetchError)
    throw createError({ statusCode: 500, message: fetchError.message })

  return updated
})
