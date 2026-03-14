import type { AppRole } from '~/composables/useProfile'

const ROLE_ROUTES: Record<AppRole, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  member: '/member',
  staff: '/staff',
}

const PATH_ROLES: Record<string, AppRole[]> = {
  '/superadmin': ['superadmin'],
  '/admin': ['superadmin', 'admin'],
  '/member': ['superadmin', 'admin', 'member', 'staff'],
  '/staff': ['superadmin', 'admin', 'staff'],
}

function getRequiredRoles(path: string): AppRole[] | null {
  for (const [prefix, roles] of Object.entries(PATH_ROLES)) {
    if (path === prefix || path.startsWith(prefix + '/'))
      return roles
  }
  return null
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth === false)
    return

  const user = useSupabaseUser()
  if (!user.value) return

  const { ensureProfile } = useProfile()
  const profile = await ensureProfile()
  if (!profile) {
    return navigateTo('/auth/login', { replace: true })
  }

  const requiredRoles = getRequiredRoles(to.path)
  if (!requiredRoles) return

  const hasRole = requiredRoles.includes(profile.role as AppRole)
  if (!hasRole) {
    const home = ROLE_ROUTES[profile.role as AppRole] ?? '/member'
    return navigateTo(home, { replace: true })
  }
})
