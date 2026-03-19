import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { buildPhoneCandidates, isSamePhone, phoneDigits } from '~/server/utils/phone'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  identifier: z.string().trim().min(1),
})

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default defineSafeEventHandler(async (event) => {
  enforceRateLimit(event, {
    bucket: 'auth:resolve-identifier',
    limit: 20,
    windowMs: 60_000,
  })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const raw = parsed.data.identifier.trim()
  if (isEmail(raw))
    return { email: raw.toLowerCase() }

  const normalizedDigits = phoneDigits(raw)
  const candidates = buildPhoneCandidates(raw)
  if (!candidates.length && !normalizedDigits)
    throw createError({ statusCode: 400, message: 'Invalid email or phone.' })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('profiles')
    .select('email, mobile_number, is_mobile_logged_in')
    .eq('status', 'active')
    .in('mobile_number', candidates)
    .limit(20)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const rows = (data ?? []) as Array<{ email: string | null; mobile_number: string | null; is_mobile_logged_in: boolean | null }>
  const exactByNormalized = rows.find(row => isSamePhone(String(row.mobile_number ?? ''), raw))

  if (exactByNormalized?.email) {
    if (!exactByNormalized.is_mobile_logged_in) {
      throw createError({
        statusCode: 400,
        message: 'Mobile login is disabled for this account. Please sign in with email.',
      })
    }
    return { email: String(exactByNormalized.email).trim().toLowerCase() }
  }

  if (normalizedDigits) {
    const fuzzyPattern = `%${normalizedDigits.split('').join('%')}%`
    const { data: fuzzyRows, error: fuzzyError } = await supabase
      .from('profiles')
      .select('email, mobile_number, is_mobile_logged_in')
      .eq('status', 'active')
      .ilike('mobile_number', fuzzyPattern)
      .limit(20)

    if (fuzzyError)
      throw createError({ statusCode: 500, message: fuzzyError.message })

    const matched = ((fuzzyRows ?? []) as Array<{ email: string | null; mobile_number: string | null; is_mobile_logged_in: boolean | null }>)
      .find(row => isSamePhone(String(row.mobile_number ?? ''), raw))

    if (matched?.email) {
      if (!matched.is_mobile_logged_in) {
        throw createError({
          statusCode: 400,
          message: 'Mobile login is disabled for this account. Please sign in with email.',
        })
      }
      return { email: String(matched.email).trim().toLowerCase() }
    }
  }

  throw createError({ statusCode: 400, message: 'Invalid email or phone.' })
})
