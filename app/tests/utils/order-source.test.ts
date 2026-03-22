import { describe, expect, it } from 'vitest'
import { isMemberOrderSource, MEMBER_ORDER_SOURCE, POS_ORDER_SOURCE } from '~/server/utils/order-source'

describe('order-source', () => {
  it('returns true only for canonical member source', () => {
    expect(isMemberOrderSource(MEMBER_ORDER_SOURCE)).toBe(true)
    expect(isMemberOrderSource('Member Purchase')).toBe(false)
    expect(isMemberOrderSource(POS_ORDER_SOURCE)).toBe(false)
    expect(isMemberOrderSource('')).toBe(false)
    expect(isMemberOrderSource(null)).toBe(false)
    expect(isMemberOrderSource(undefined)).toBe(false)
  })
})

