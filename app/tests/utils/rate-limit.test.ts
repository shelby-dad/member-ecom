import { afterEach, describe, expect, it } from 'vitest'
import { checkRateLimit, resetRateLimitStoreForTest } from '~/server/utils/rate-limit'

describe('rate-limit utils', () => {
  afterEach(() => {
    resetRateLimitStoreForTest()
  })

  it('allows requests until limit is reached', () => {
    const now = 1_000
    const one = checkRateLimit('k1', 2, 60_000, now)
    const two = checkRateLimit('k1', 2, 60_000, now + 1)
    const three = checkRateLimit('k1', 2, 60_000, now + 2)

    expect(one.allowed).toBe(true)
    expect(two.allowed).toBe(true)
    expect(three.allowed).toBe(false)
    expect(three.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('resets after window passes', () => {
    const now = 10_000
    checkRateLimit('k2', 1, 1_000, now)
    const blocked = checkRateLimit('k2', 1, 1_000, now + 10)
    const reset = checkRateLimit('k2', 1, 1_000, now + 1_500)

    expect(blocked.allowed).toBe(false)
    expect(reset.allowed).toBe(true)
  })
})
