import { describe, expect, it } from 'vitest'
import { resolveThemeName } from '~/composables/themeMode'

describe('theme mode resolution', () => {
  it('honors explicit light and dark modes', () => {
    expect(resolveThemeName('light', false, true)).toBe('light')
    expect(resolveThemeName('dark', false, false)).toBe('dark')
  })

  it('defaults system mode to light before mount', () => {
    expect(resolveThemeName('system', false, true)).toBe('light')
  })

  it('resolves system mode based on OS preference after mount', () => {
    expect(resolveThemeName('system', true, true)).toBe('dark')
    expect(resolveThemeName('system', true, false)).toBe('light')
  })
})
