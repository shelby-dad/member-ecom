import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  bank_name: z.string().optional().nullable(),
  image_path: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: existing, error: existingError } = await supabase
    .from('payment_methods')
    .select('id, type, name, account_name, account_number, bank_name, image_path, is_active, sort_order')
    .eq('id', id)
    .single()
  if (existingError)
    throw createError({ statusCode: 500, message: existingError.message })
  if (!existing)
    throw createError({ statusCode: 404, message: 'Payment method not found' })
  if (existing.type !== 'bank_transfer')
    throw createError({ statusCode: 403, message: 'Only bank transfer payment methods can be edited.' })

  const nextName = parsed.data.name !== undefined ? parsed.data.name.trim() : String(existing.name ?? '').trim()
  const nextAccountName = parsed.data.account_name !== undefined ? parsed.data.account_name.trim() : String(existing.account_name ?? '').trim()
  const nextAccountNumber = parsed.data.account_number !== undefined ? parsed.data.account_number.trim() : String(existing.account_number ?? '').trim()
  if (!nextName)
    throw createError({ statusCode: 400, message: 'Name is required.' })
  if (!nextAccountName || !nextAccountNumber)
    throw createError({ statusCode: 400, message: 'Account name and account number are required for bank transfer.' })

  const updates: Record<string, unknown> = {
    name: nextName,
    account_name: nextAccountName,
    account_number: nextAccountNumber,
  }
  if (parsed.data.bank_name !== undefined)
    updates.bank_name = parsed.data.bank_name?.trim() || null
  if (parsed.data.image_path !== undefined)
    updates.image_path = parsed.data.image_path?.trim() || null
  if (parsed.data.is_active !== undefined)
    updates.is_active = parsed.data.is_active
  if (parsed.data.sort_order !== undefined)
    updates.sort_order = parsed.data.sort_order

  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
