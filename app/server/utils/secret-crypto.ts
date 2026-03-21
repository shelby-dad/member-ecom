import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function deriveKey(key: string) {
  return createHash('sha256').update(key).digest()
}

function normalizeCryptoKey(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return ''
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
    return raw.slice(1, -1).trim()
  return raw
}

function toBase64Url(buf: Buffer) {
  return buf.toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

export interface SecretParts {
  iv: string
  content: string
}

const WRAPPED_PREFIX = 'enc:ivcontent:'

export function isEncryptedSecret(value: string | null | undefined) {
  return String(value ?? '').startsWith(WRAPPED_PREFIX)
}

export function encryptSecretParts(plainText: string, cryptoKey: string): SecretParts {
  const text = String(plainText ?? '')
  const key = normalizeCryptoKey(cryptoKey)
  if (!text)
    return { iv: '', content: '' }
  if (!key)
    throw new Error('CRYPTO_KEY is required to encrypt secret settings.')

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(key), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const content = Buffer.concat([encrypted, tag])
  return {
    iv: toBase64Url(iv),
    content: toBase64Url(content),
  }
}

export function decryptSecretParts(ivValue: string, contentValue: string, cryptoKey: string) {
  const ivPart = String(ivValue ?? '').trim()
  const contentPart = String(contentValue ?? '').trim()
  const key = normalizeCryptoKey(cryptoKey)
  if (!ivPart || !contentPart)
    return ''
  if (!key)
    throw new Error('CRYPTO_KEY is required to decrypt secret settings.')

  try {
    const iv = fromBase64Url(ivPart)
    const content = fromBase64Url(contentPart)
    if (content.length <= 16)
      throw new Error('Invalid encrypted secret format.')
    const data = content.subarray(0, content.length - 16)
    const tag = content.subarray(content.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(key), iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(data), decipher.final()])
    return plain.toString('utf8')
  } catch {
    throw new Error('Failed to decrypt secret settings. Check CRYPTO_KEY.')
  }
}

// Compatibility helpers for existing imports/tests.
// SMTP settings storage uses dedicated iv/content columns.
export function encryptSecret(plainText: string, cryptoKey: string) {
  const { iv, content } = encryptSecretParts(plainText, cryptoKey)
  if (!iv || !content)
    return ''
  return `${WRAPPED_PREFIX}${iv}:${content}`
}

export function decryptSecret(value: string, cryptoKey: string) {
  const payload = String(value ?? '').trim()
  if (!payload)
    return ''
  if (!payload.startsWith(WRAPPED_PREFIX))
    throw new Error('Unsupported encrypted payload format.')

  const encoded = payload.slice(WRAPPED_PREFIX.length)
  const [ivPart, contentPart] = encoded.split(':')
  if (!ivPart || !contentPart)
    throw new Error('Invalid encrypted secret format.')
  return decryptSecretParts(ivPart, contentPart, cryptoKey)
}
