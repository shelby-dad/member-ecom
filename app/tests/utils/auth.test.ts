import { describe, it, expect } from 'vitest'
import { requireRoles } from '~/server/utils/auth'

describe('requireRoles', () => {
  it('does not throw when profile role is in allowed list', () => {
    expect(() => requireRoles({ role: 'admin' }, ['superadmin', 'admin'])).not.toThrow()
    expect(() => requireRoles({ role: 'member' }, ['member', 'staff'])).not.toThrow()
  })

  it('throws 403 when profile role is not in allowed list', () => {
    expect(() => requireRoles({ role: 'member' }, ['admin', 'superadmin'])).toThrow()
    expect(() => requireRoles({ role: 'staff' }, ['admin'])).toThrow()
  })
})
