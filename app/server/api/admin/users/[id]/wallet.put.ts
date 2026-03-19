import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  wallet_balance: z.number().min(0).optional(),
  wallet_amount: z.number().min(0).optional(),
}).superRefine((value, ctx) => {
  if (value.wallet_balance == null && value.wallet_amount == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'wallet_balance or wallet_amount is required',
    })
  }
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const userId = getRouterParam(event, 'id')
  if (!userId)
    throw createError({ statusCode: 400, message: 'Missing user id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  let nextBalance = Number(parsed.data.wallet_balance ?? 0)
  if (parsed.data.wallet_amount != null) {
    const { data: currentRow, error: currentError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle()
    if (currentError)
      throw createError({ statusCode: 500, message: currentError.message })
    if (!currentRow)
      throw createError({ statusCode: 404, message: 'User not found' })
    nextBalance = Number(currentRow.wallet_balance ?? 0) + Number(parsed.data.wallet_amount ?? 0)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ wallet_balance: Math.max(0, Number(nextBalance)) })
    .eq('id', userId)
    .select('id, wallet_balance')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data
})
