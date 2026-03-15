import type { AppRole } from '~/utils/role-switch'
import { getAvailableRoles, resolveEffectiveRole } from '~/utils/role-switch'

export function useActiveRole(baseRole: Ref<AppRole | null>) {
  const activeRoleCookie = useCookie<AppRole | null>('active-role', { sameSite: 'lax', path: '/' })
  const activeRoleState = useState<AppRole | null>('active-role-effective', () => null)

  const availableRoles = computed(() => {
    if (!baseRole.value)
      return [] as AppRole[]
    return getAvailableRoles(baseRole.value)
  })

  function syncActiveRole() {
    if (!baseRole.value) {
      activeRoleState.value = null
      return null
    }

    const resolved = resolveEffectiveRole(baseRole.value, activeRoleCookie.value)
    activeRoleState.value = resolved
    activeRoleCookie.value = resolved
    return resolved
  }

  function setActiveRole(role: AppRole) {
    if (!baseRole.value)
      return null

    const resolved = resolveEffectiveRole(baseRole.value, role)
    activeRoleState.value = resolved
    activeRoleCookie.value = resolved
    return resolved
  }

  return {
    activeRole: readonly(activeRoleState),
    availableRoles,
    syncActiveRole,
    setActiveRole,
  }
}
