import { z } from 'zod'
import { getProfileOrThrow, requireRoles, type AppRole } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { canCreateRole } from '~/server/utils/user-management'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1).max(120).optional(),
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
    role: profilePayload.role,
    status: profilePayload.status,
  }
})
