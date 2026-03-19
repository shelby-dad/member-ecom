import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const SECRET_PREFIX = 'enc:v1:'

function deriveKey(key: string) {
  return createHash('sha256').update(key).digest()
}

function toBase64Url(buf: Buffer) {
  return buf.toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

export function isEncryptedSecret(value: string | null | undefined) {
  return String(value ?? '').startsWith(SECRET_PREFIX)
}

export function encryptSecret(plainText: string, cryptoKey: string) {
  const text = String(plainText ?? '')
  const key = String(cryptoKey ?? '').trim()
  if (!text)
    return ''
  if (!key)
    throw new Error('CRYPTO_KEY is required to encrypt secret settings.')

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(key), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${SECRET_PREFIX}${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(encrypted)}`
}

export function decryptSecret(value: string, cryptoKey: string) {
  const payload = String(value ?? '')
  const key = String(cryptoKey ?? '').trim()
  if (!payload)
    return ''
  if (!isEncryptedSecret(payload))
    return payload
  if (!key)
    throw new Error('CRYPTO_KEY is required to decrypt secret settings.')

  const encoded = payload.slice(SECRET_PREFIX.length)
  const [ivPart, tagPart, dataPart] = encoded.split(':')
  if (!ivPart || !tagPart || !dataPart)
    throw new Error('Invalid encrypted secret format.')

  try {
    const iv = fromBase64Url(ivPart)
    const tag = fromBase64Url(tagPart)
    const data = fromBase64Url(dataPart)
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(key), iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(data), decipher.final()])
    return plain.toString('utf8')
  } catch {
    throw new Error('Failed to decrypt secret settings. Check CRYPTO_KEY.')
  }
}
