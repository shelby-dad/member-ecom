import { deleteCookie, setCookie } from 'h3'
import { getProfileOrThrow } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  if (profile.baseRole !== 'superadmin')
    throw createError({ statusCode: 403, message: 'Forbidden' })

  deleteCookie(event, 'on-behalf-user-id', { path: '/' })
  deleteCookie(event, 'on-behalf-user-email', { path: '/' })
  deleteCookie(event, 'on-behalf-user-role', { path: '/' })
  setCookie(event, 'active-role', 'superadmin', {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
  })

  return { ok: true }
})
