import { z } from 'zod'
import { getProfileOrThrow, requireRoles, type AppRole } from '~/server/utils/auth'
import { buildPhoneCandidates, isSamePhone } from '~/server/utils/phone'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { canCreateRole } from '~/server/utils/user-management'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1).max(120).optional(),
  avatar_url: z.string().trim().max(500).optional().nullable(),
  mobile_number: z.string().trim().max(32).optional().nullable(),
  is_mobile_logged_in: z.boolean().optional().default(false),
  role: z.enum(['admin', 'staff', 'member']),
  status: z.enum(['active', 'inactive']).optional().default('active'),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const targetRole = parsed.data.role as AppRole
  const actorRole = profile.role as AppRole
  if (!canCreateRole(actorRole, targetRole)) {
    throw createError({
      statusCode: 403,
      message: `You cannot create accounts with role '${targetRole}'.`,
    })
  }

  const supabase = await getServiceRoleClient(event)
  const mobileNumber = parsed.data.mobile_number?.trim() || ''
  if (mobileNumber) {
    const candidates = buildPhoneCandidates(mobileNumber)
    let existingRows: Array<{ id: string; mobile_number: string | null }> = []
    if (candidates.length) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, mobile_number')
        .in('mobile_number', candidates)
        .limit(20)
      if (error)
        throw createError({ statusCode: 500, message: error.message })
      existingRows = (data ?? []) as Array<{ id: string; mobile_number: string | null }>
    }
    // Keep mobile uniqueness check fast for production user creation.
    // The fuzzy ILIKE fallback is intentionally removed to avoid full-table scans.
    if (existingRows.some(row => isSamePhone(String(row.mobile_number ?? ''), mobileNumber))) {
      throw createError({
        statusCode: 400,
        message: 'Mobile number already exists. Please use another number.',
      })
    }
  }

  const email = parsed.data.email.trim().toLowerCase()
  const { data: created, error: createErrorResult } = await supabase.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: parsed.data.full_name ? { full_name: parsed.data.full_name } : undefined,
  })

  if (createErrorResult || !created.user?.id) {
    throw createError({
      statusCode: 400,
      message: createErrorResult?.message ?? 'Failed to create user account.',
    })
  }

  const userId = created.user.id
  const profilePayload = {
    email,
    full_name: parsed.data.full_name ?? null,
    avatar_url: parsed.data.avatar_url?.trim() || null,
    mobile_number: parsed.data.mobile_number?.trim() || null,
    is_mobile_logged_in: actorRole === 'superadmin' && targetRole === 'member'
      ? Boolean(parsed.data.is_mobile_logged_in)
      : false,
    role: targetRole,
    status: parsed.data.status,
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('id', userId)

  if (updateError) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, ...profilePayload })

    if (insertError)
      throw createError({ statusCode: 500, message: insertError.message })
  }

  return {
    id: userId,
    email,
    full_name: profilePayload.full_name,
    avatar_url: profilePayload.avatar_url,
    mobile_number: profilePayload.mobile_number,
    is_mobile_logged_in: profilePayload.is_mobile_logged_in,
    role: profilePayload.role,
    status: profilePayload.status,
  }
})
