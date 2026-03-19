export function normalizePhoneInput(value: string) {
  return String(value ?? '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
    .trim()
}

export function phoneDigits(value: string) {
  const normalized = normalizePhoneInput(value)
    .replace(/[၀-၉]/g, ch => String(ch.charCodeAt(0) - 0x1040))
    .replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 0x06F0))
  return normalized.replace(/\D/g, '')
}

function canonicalMyanmarDigits(value: string) {
  let digits = phoneDigits(value)
  if (!digits)
    return ''
  if (digits.startsWith('95'))
    digits = digits.slice(2)
  if (digits.startsWith('0'))
    digits = digits.slice(1)
  return digits
}

export function isSamePhone(a: string, b: string) {
  const ca = canonicalMyanmarDigits(a)
  const cb = canonicalMyanmarDigits(b)
  return Boolean(ca) && ca === cb
}

export function buildPhoneCandidates(input: string) {
  const trimmed = normalizePhoneInput(input)
  const compact = trimmed.replace(/[^\d+]/g, '')
  const digits = phoneDigits(compact)
  const set = new Set<string>()

  if (trimmed)
    set.add(trimmed)
  if (compact)
    set.add(compact)
  if (digits)
    set.add(digits)

  if (digits.startsWith('0')) {
    const tail = digits.slice(1)
    if (tail) {
      set.add(tail)
      set.add(`95${tail}`)
      set.add(`+95${tail}`)
      set.add(`0${tail}`)
    }
  } else if (digits.startsWith('95')) {
    const tail = digits.slice(2)
    if (tail) {
      set.add(tail)
      set.add(`0${tail}`)
      set.add(`95${tail}`)
      set.add(`+95${tail}`)
    }
  } else if (digits.startsWith('9')) {
    set.add(`0${digits}`)
    set.add(`95${digits}`)
    set.add(`+95${digits}`)
  }

  return [...set].filter(Boolean)
}
