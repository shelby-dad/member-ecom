import { describe, expect, it } from 'vitest'
import { decryptSecretParts, encryptSecretParts } from '~/server/utils/secret-crypto'
import { decryptSecretParts as decryptSecretPartsEdge } from '../../../functions/_shared/secret-crypto'

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

  it('is cross-runtime compatible with edge decrypt', async () => {
    const encrypted = encryptSecretParts('shared-secret', 'cross-key')
    const decrypted = await decryptSecretPartsEdge(encrypted.iv, encrypted.content, 'cross-key')
    expect(decrypted).toBe('shared-secret')
  })
})
