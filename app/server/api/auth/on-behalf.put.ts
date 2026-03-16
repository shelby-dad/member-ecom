import { z } from 'zod'
import { setCookie } from 'h3'
import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import type { AppRole } from '~/utils/role-switch'

const bodySchema = z.object({
  user_id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  if (profile.baseRole !== 'superadmin')
    throw createError({ statusCode: 403, message: 'Forbidden' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: target, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', parsed.data.user_id)
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (!target)
    throw createError({ statusCode: 404, message: 'User not found' })
  if ((target.role as AppRole) === 'superadmin')
    throw createError({ statusCode: 400, message: 'Cannot act on behalf of superadmin.' })

  const targetRole = target.role as AppRole
  setCookie(event, 'on-behalf-user-id', target.id, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    httpOnly: false,
  })
  setCookie(event, 'on-behalf-user-email', String(target.email ?? ''), {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    httpOnly: false,
  })
  setCookie(event, 'on-behalf-user-role', targetRole, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    httpOnly: false,
  })
  setCookie(event, 'active-role', targetRole, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
  })

  return {
    ok: true,
    on_behalf: {
      id: target.id,
      email: String(target.email ?? ''),
      role: targetRole,
    },
  }
})
