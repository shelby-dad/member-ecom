import { describe, expect, it } from 'vitest'
import { getNavigationForRole, getRoleHome } from '~/composables/useAppNavigation'

describe('useAppNavigation model', () => {
  it('returns stable home routes for each role', () => {
    expect(getRoleHome('superadmin')).toBe('/superadmin')
    expect(getRoleHome('admin')).toBe('/admin')
    expect(getRoleHome('staff')).toBe('/staff')
    expect(getRoleHome('member')).toBe('/member')
  })

  it('returns the expected admin navigation entries', () => {
    const items = getNavigationForRole('admin')
    expect(items.map(item => item.to)).toEqual([
      '/admin',
      '/admin/users',
      '/staff/pos',
      '/admin/products',
      '/admin/orders',
      '/admin/payment-methods',
    ])
  })

  it('includes role-specific first destination for every role', () => {
    expect(getNavigationForRole('superadmin')[0].to).toBe('/superadmin')
    expect(getNavigationForRole('staff')[0].to).toBe('/staff')
    expect(getNavigationForRole('member')[0].to).toBe('/member')
  })
})
