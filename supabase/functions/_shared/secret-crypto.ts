function base64ToBytes(base64: string) {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const text = atob(padded)
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1)
    out[i] = text.charCodeAt(i)
  return out
}

function normalizeCryptoKey(value: string) {
  const raw = String(value || '').trim()
  if (!raw)
    return ''
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
    return raw.slice(1, -1).trim()
  return raw
}

async function deriveSha256KeyBytes(raw: string) {
  const input = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return new Uint8Array(digest)
}

export async function decryptSecretParts(ivValue: string, contentValue: string, cryptoKey: string) {
  const ivPart = String(ivValue || '').trim()
  const contentPart = String(contentValue || '').trim()
  const key = normalizeCryptoKey(cryptoKey)

  if (!ivPart || !contentPart)
    return ''
  if (!key)
    throw new Error('Missing CRYPTO_KEY.')

  const iv = base64ToBytes(ivPart)
  const content = base64ToBytes(contentPart)
  if (content.length <= 16)
    throw new Error('Invalid encrypted payload.')

  const keyBytes = await deriveSha256KeyBytes(key)
  const cryptoKeyObj = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKeyObj,
    content,
  )

  return new TextDecoder().decode(plain)
}
