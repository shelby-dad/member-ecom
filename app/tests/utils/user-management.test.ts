import { describe, expect, it } from 'vitest'
import { canCreateRole, getCreatableRoles } from '~/server/utils/user-management'

describe('user management role rules', () => {
  it('allows admin to create only lower roles', () => {
    expect(getCreatableRoles('admin')).toEqual(['staff', 'member'])
    expect(canCreateRole('admin', 'staff')).toBe(true)
    expect(canCreateRole('admin', 'member')).toBe(true)
    expect(canCreateRole('admin', 'admin')).toBe(false)
  })

  it('allows superadmin to create admin/staff/member', () => {
    expect(getCreatableRoles('superadmin')).toEqual(['admin', 'staff', 'member'])
    expect(canCreateRole('superadmin', 'admin')).toBe(true)
  })

  it('disallows member/staff from creating users', () => {
    expect(getCreatableRoles('staff')).toEqual([])
    expect(getCreatableRoles('member')).toEqual([])
  })
})
