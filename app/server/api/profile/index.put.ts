import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().trim().email(),
  mobile_number: z.string().trim().max(32).optional().nullable(),
  avatar_url: z.string().trim().max(500).optional().nullable(),
  password: z.string().min(6).max(128).optional(),
})

function normalizePhone(value: string) {
  return value.replace(/[\s\-().]/g, '')
}

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event)
  if (!authUser?.id)
    throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const email = parsed.data.email.trim().toLowerCase()
  const fullName = parsed.data.full_name.trim()
  const mobile = parsed.data.mobile_number?.trim() || null

  if (mobile) {
    const normalized = normalizePhone(mobile)
    const candidates = [...new Set([mobile, normalized].filter(Boolean))]
    const { data: existing, error: mobileErr } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', authUser.id)
      .in('mobile_number', candidates)
      .limit(1)
      .maybeSingle()

    if (mobileErr)
      throw createError({ statusCode: 500, message: mobileErr.message })
    if (existing?.id)
      throw createError({ statusCode: 409, message: 'Mobile number is already in use.' })
  }

  const authUpdates: Record<string, unknown> = {}
  if (email !== String(authUser.email ?? '').toLowerCase())
    authUpdates.email = email
  if (parsed.data.password?.trim())
    authUpdates.password = parsed.data.password.trim()

  if (Object.keys(authUpdates).length) {
    const authResult = await supabase.auth.admin.updateUserById(authUser.id, authUpdates)
    if (authResult.error)
      throw createError({ statusCode: 400, message: authResult.error.message })
  }

  const profileUpdates = {
    email,
    full_name: fullName,
    mobile_number: mobile,
    avatar_url: parsed.data.avatar_url?.trim() || null,
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', authUser.id)

  if (updateErr)
    throw createError({ statusCode: 500, message: updateErr.message })

  const { data: updated, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, mobile_number, avatar_url, role, branch_id, status, wallet_balance, created_at, updated_at')
    .eq('id', authUser.id)
    .single()

  if (fetchErr || !updated)
    throw createError({ statusCode: 500, message: fetchErr?.message ?? 'Failed to load updated profile.' })

  return {
    profile: updated,
    password_updated: Boolean(parsed.data.password?.trim()),
  }
})
