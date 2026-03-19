import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret, isEncryptedSecret } from '~/server/utils/secret-crypto'

describe('secret-crypto utils', () => {
  it('encrypts and decrypts with the same key', () => {
    const encrypted = encryptSecret('my-smtp-password', 'my-crypto-key')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    const decrypted = decryptSecret(encrypted, 'my-crypto-key')
    expect(decrypted).toBe('my-smtp-password')
  })

  it('keeps legacy plain values readable', () => {
    expect(decryptSecret('legacy-plain-secret', 'any-key')).toBe('legacy-plain-secret')
  })

  it('throws on wrong key', () => {
    const encrypted = encryptSecret('top-secret', 'key-1')
    expect(() => decryptSecret(encrypted, 'key-2')).toThrow(/CRYPTO_KEY|decrypt/i)
  })
})
