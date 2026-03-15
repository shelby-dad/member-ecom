export type AppRole = 'superadmin' | 'admin' | 'staff' | 'member'

const ROLE_ORDER: AppRole[] = ['member', 'staff', 'admin', 'superadmin']

function roleRank(role: AppRole): number {
  return ROLE_ORDER.indexOf(role)
}

export function canActAs(baseRole: AppRole, targetRole: AppRole): boolean {
  return roleRank(targetRole) <= roleRank(baseRole)
}

export function getAvailableRoles(baseRole: AppRole): AppRole[] {
  return ROLE_ORDER.filter(role => canActAs(baseRole, role)).reverse()
}

export function resolveEffectiveRole(baseRole: AppRole, requestedRole?: string | null): AppRole {
  if (!requestedRole)
    return baseRole

  if (!ROLE_ORDER.includes(requestedRole as AppRole))
    return baseRole

  const target = requestedRole as AppRole
  return canActAs(baseRole, target) ? target : baseRole
}
