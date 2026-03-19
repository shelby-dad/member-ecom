import { resolveEffectiveRole } from '~/utils/role-switch'
import type { AppRole } from '~/utils/role-switch'

const ROLE_ROUTES: Record<AppRole, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  member: '/member',
  staff: '/staff',
}

const PATH_ROLES: Record<string, AppRole[]> = {
  '/superadmin': ['superadmin'],
  '/superadmin/inbox': ['superadmin'],
  '/print': ['superadmin', 'admin', 'staff', 'member'],
  '/admin/inbox': ['superadmin', 'admin'],
  '/admin/products': ['superadmin', 'admin', 'staff'],
  '/admin/product-metadata': ['superadmin', 'admin', 'staff'],
  '/admin/orders': ['superadmin', 'admin', 'staff'],
  '/admin/promotions': ['superadmin', 'admin'],
  '/admin': ['superadmin', 'admin'],
  '/member': ['superadmin', 'admin', 'member', 'staff'],
  '/member/chat': ['superadmin', 'admin', 'member', 'staff'],
  '/staff/inbox': ['superadmin', 'admin', 'staff'],
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

  const activeRoleCookie = useCookie<AppRole | null>('active-role')
  const onBehalfRoleCookie = useCookie<AppRole | null>('on-behalf-user-role')
  const effectiveRole = onBehalfRoleCookie.value
    ? (onBehalfRoleCookie.value as AppRole)
    : resolveEffectiveRole(profile.role as AppRole, activeRoleCookie.value)
  activeRoleCookie.value = effectiveRole

  const requiredRoles = getRequiredRoles(to.path)
  if (!requiredRoles) return

  const hasRole = requiredRoles.includes(effectiveRole)
  if (!hasRole) {
    const home = ROLE_ROUTES[effectiveRole] ?? '/member'
    return navigateTo(home, { replace: true })
  }
})
