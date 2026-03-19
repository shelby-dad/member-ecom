import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  site_name: z.string().max(80).optional().nullable(),
  site_favicon_original: z.string().max(255).optional().nullable(),
  site_favicon_64: z.string().max(255).optional().nullable(),
  site_favicon_84: z.string().max(255).optional().nullable(),
  site_favicon_512: z.string().max(255).optional().nullable(),
  pricing_sign: z.string().max(8).optional(),
  pricing_symbol: z.string().min(1).max(16).optional(),
  pricing_label: z.string().min(1).max(40).optional(),
  pricing_decimals: z.number().int().min(0).max(4).optional(),
  pricing_symbol_position: z.enum(['before', 'after']).optional(),
  shop_logo: z.string().optional().nullable(),
  shop_name: z.string().optional().nullable(),
  shop_address: z.string().optional().nullable(),
  shop_email: z.string().email().optional().nullable(),
  mobile_number: z.string().optional().nullable(),
  barcode_type: z.enum(['code128', 'ean13', 'upca']).optional(),
  smtp_host: z.string().optional().nullable(),
  smtp_port: z.number().int().min(1).max(65535).optional().nullable(),
  smtp_user: z.string().optional().nullable(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().email().optional().nullable(),
  smtp_from_name: z.string().optional().nullable(),
  smtp_secure: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const smtpHost = parsed.data.smtp_host?.trim() ?? ''
  const smtpUser = parsed.data.smtp_user?.trim() ?? ''
  const smtpFromEmail = parsed.data.smtp_from_email?.trim() ?? ''
  const smtpFromName = parsed.data.smtp_from_name?.trim() ?? ''
  const smtpPassword = parsed.data.smtp_password?.trim() ?? ''
  const smtpPort = parsed.data.smtp_port ?? null

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key === 'smtp_password') {
      updates.smtp_password = smtpPassword || null
      continue
    }
    if (key === 'smtp_host') {
      updates.smtp_host = smtpHost || null
      continue
    }
    if (key === 'smtp_user') {
      updates.smtp_user = smtpUser || null
      continue
    }
    if (key === 'smtp_from_email') {
      updates.smtp_from_email = smtpFromEmail || null
      continue
    }
    if (key === 'smtp_from_name') {
      updates.smtp_from_name = smtpFromName || null
      continue
    }
    updates[key] = value ?? null
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ id: true, ...updates }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to update settings' })

  return {
    ...data,
    smtp_password: '',
    smtp_password_set: !!data.smtp_password,
  }
})
