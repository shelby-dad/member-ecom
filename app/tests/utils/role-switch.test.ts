import { describe, expect, it } from 'vitest'
import { canActAs, getAvailableRoles, resolveEffectiveRole } from '~/utils/role-switch'

describe('role switch hierarchy', () => {
  it('allows downward switching but not upward beyond base role', () => {
    expect(canActAs('admin', 'staff')).toBe(true)
    expect(canActAs('admin', 'member')).toBe(true)
    expect(canActAs('admin', 'superadmin')).toBe(false)
  })

  it('returns ordered available roles for base role', () => {
    expect(getAvailableRoles('superadmin')).toEqual(['superadmin', 'admin', 'staff', 'member'])
    expect(getAvailableRoles('admin')).toEqual(['admin', 'staff', 'member'])
  })

  it('resolves invalid/too-high requested role back to base role', () => {
    expect(resolveEffectiveRole('admin', 'staff')).toBe('staff')
    expect(resolveEffectiveRole('admin', 'superadmin')).toBe('admin')
    expect(resolveEffectiveRole('staff', 'invalid')).toBe('staff')
  })
})
