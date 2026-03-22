import { describe, expect, it } from 'vitest'
import { decryptSecretParts, encryptSecretParts } from '~/server/utils/secret-crypto'

describe('secret-crypto utils', () => {
  it('encrypts and decrypts with the same key (iv/content format)', () => {
    const encrypted = encryptSecretParts('my-smtp-password', 'my-crypto-key')
    expect(encrypted.iv.length).toBeGreaterThan(0)
    expect(encrypted.content.length).toBeGreaterThan(0)
    const decrypted = decryptSecretParts(encrypted.iv, encrypted.content, 'my-crypto-key')
    expect(decrypted).toBe('my-smtp-password')
  })

  it('throws on wrong key', () => {
    const encrypted = encryptSecretParts('top-secret', 'key-1')
    expect(() => decryptSecretParts(encrypted.iv, encrypted.content, 'key-2')).toThrow(/CRYPTO_KEY|decrypt/i)
  })

  it('supports iv/content shape for queue + server processors', () => {
    const encrypted = encryptSecretParts('shared-secret', 'cross-key')
    expect(encrypted.iv).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(encrypted.content).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})
