import type { AppRole } from '~/server/utils/auth'

export function getCreatableRoles(actorRole: AppRole): AppRole[] {
  if (actorRole === 'superadmin')
    return ['admin', 'staff', 'member']
  if (actorRole === 'admin')
    return ['staff', 'member']
  return []
}

export function canCreateRole(actorRole: AppRole, targetRole: AppRole): boolean {
  return getCreatableRoles(actorRole).includes(targetRole)
}
