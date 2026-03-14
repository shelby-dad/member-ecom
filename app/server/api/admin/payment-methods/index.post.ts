import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1),
  account_name: z.string().min(1),
  account_number: z.string().min(1),
  bank_name: z.string().optional(),
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

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      name: parsed.data.name,
      account_name: parsed.data.account_name,
      account_number: parsed.data.account_number,
      bank_name: parsed.data.bank_name ?? null,
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
