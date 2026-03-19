import { describe, expect, it } from 'vitest'
import {
  escapeLike,
  isExactOrderNumber,
  normalizeAdminOrderSort,
  normalizeMemberOrderSort,
  normalizePage,
  normalizePerPage,
  normalizeSortOrder,
  toEndOfDayIso,
  toStartOfDayIso,
} from '~/server/utils/order-query'

describe('order-query utils', () => {
  it('normalizes sort order and pagination values', () => {
    expect(normalizeSortOrder('asc')).toBe('asc')
    expect(normalizeSortOrder('DESC')).toBe('desc')
    expect(normalizePage('0')).toBe(1)
    expect(normalizePage('3')).toBe(3)
    expect(normalizePerPage('50', [25, 50, 100], 25)).toBe(50)
    expect(normalizePerPage('999', [25, 50, 100], 25)).toBe(25)
  })

  it('normalizes admin/member sort keys', () => {
    expect(normalizeAdminOrderSort('member_email')).toBe('member_email')
    expect(normalizeAdminOrderSort('invalid')).toBe('created_at')
    expect(normalizeMemberOrderSort('payment_status')).toBe('payment_status')
    expect(normalizeMemberOrderSort('invalid')).toBe('created_at')
  })

  it('escapes wildcard characters for ilike queries', () => {
    expect(escapeLike('100%_ok')).toBe('100\\%\\_ok')
  })

  it('converts valid date range values to day boundary ISO', () => {
    const start = toStartOfDayIso('2026-03-18')
    const end = toEndOfDayIso('2026-03-18')
    expect(start?.endsWith('00:00:00.000Z')).toBe(true)
    expect(end?.endsWith('23:59:59.999Z')).toBe(true)
    expect(toStartOfDayIso('2026/03/18')).toBeNull()
  })

  it('detects exact order number format', () => {
    expect(isExactOrderNumber('ORD-ABCD1234')).toBe(true)
    expect(isExactOrderNumber('ord-abcd1234')).toBe(true)
    expect(isExactOrderNumber('ORD-ABC1234')).toBe(false)
  })
})
