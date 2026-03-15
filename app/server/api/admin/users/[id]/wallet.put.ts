import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  wallet_balance: z.number().min(0),
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
  const { data, error } = await supabase
    .from('profiles')
    .update({ wallet_balance: Number(parsed.data.wallet_balance.toFixed(2)) })
    .eq('id', userId)
    .select('id, wallet_balance')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data
})
