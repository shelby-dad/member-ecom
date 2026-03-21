export function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim() || ''
  if (!value)
    throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function optionalEnv(name: string, fallback = '') {
  const value = Deno.env.get(name)
  if (value == null)
    return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}
