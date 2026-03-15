import { z } from 'zod'
import { setCookie } from 'h3'
import { getProfileOrThrow } from '~/server/utils/auth'
import { canActAs, getAvailableRoles, type AppRole } from '~/utils/role-switch'

const bodySchema = z.object({
  role: z.enum(['superadmin', 'admin', 'staff', 'member']),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const baseRole = profile.baseRole as AppRole
  const targetRole = parsed.data.role as AppRole

  if (!canActAs(baseRole, targetRole)) {
    throw createError({
      statusCode: 403,
      message: `You cannot switch to '${targetRole}' from '${baseRole}'.`,
    })
  }

  setCookie(event, 'active-role', targetRole, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
  })

  return {
    role: targetRole,
    baseRole,
    availableRoles: getAvailableRoles(baseRole),
  }
})
