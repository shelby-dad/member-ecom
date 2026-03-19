import { describe, expect, it } from 'vitest'
import { createError } from 'h3'
import { normalizeApiError } from '~/server/utils/api-error'

describe('api-error utils', () => {
  it('keeps 4xx messages', () => {
    const err = normalizeApiError(createError({ statusCode: 400, message: 'Invalid input' }))
    expect((err as any).statusCode).toBe(400)
    expect((err as any).message).toContain('Invalid input')
  })

  it('sanitizes 5xx messages', () => {
    const err = normalizeApiError(createError({ statusCode: 500, message: 'db details leaked' }))
    expect((err as any).statusCode).toBe(500)
    expect((err as any).message).toContain('Internal server error')
  })

  it('defaults unknown errors to 500 safe message', () => {
    const err = normalizeApiError(new Error('unexpected stack detail'))
    expect((err as any).statusCode).toBe(500)
    expect((err as any).message).toContain('Internal server error')
  })
})
