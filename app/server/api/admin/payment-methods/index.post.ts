import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['wallet', 'bank_transfer', 'cash', 'cod']).optional(),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  bank_name: z.string().optional(),
  image_path: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })
  if (parsed.data.type && parsed.data.type !== 'bank_transfer')
    throw createError({ statusCode: 403, message: 'Only bank transfer payment methods can be created.' })
  if (parsed.data.type === 'bank_transfer' && (!parsed.data.account_name?.trim() || !parsed.data.account_number?.trim())) {
    throw createError({ statusCode: 400, message: 'Account name and account number are required for bank transfer.' })
  }
  if (!parsed.data.account_name?.trim() || !parsed.data.account_number?.trim())
    throw createError({ statusCode: 400, message: 'Account name and account number are required for bank transfer.' })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      name: parsed.data.name,
      type: 'bank_transfer',
      account_name: parsed.data.account_name?.trim() || null,
      account_number: parsed.data.account_number?.trim() || null,
      bank_name: parsed.data.bank_name ?? null,
      image_path: parsed.data.image_path?.trim() || null,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
