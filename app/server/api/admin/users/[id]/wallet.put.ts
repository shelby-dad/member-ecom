import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { notifyUser } from '~/server/services/notifications/user-notifications'

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
  requireRoles(profile, ['superadmin', 'admin'])

  const userId = getRouterParam(event, 'id')
  if (!userId)
    throw createError({ statusCode: 400, message: 'Missing user id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  let currentBalance = 0
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
    currentBalance = Number(currentRow.wallet_balance ?? 0)
    nextBalance = currentBalance + Number(parsed.data.wallet_amount ?? 0)
  }
  else {
    const { data: currentRow, error: currentError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle()
    if (currentError)
      throw createError({ statusCode: 500, message: currentError.message })
    if (!currentRow)
      throw createError({ statusCode: 404, message: 'User not found' })
    currentBalance = Number(currentRow.wallet_balance ?? 0)
  }

  const safeNextBalance = Math.max(0, Number(nextBalance))
  const { data, error } = await supabase
    .from('profiles')
    .update({ wallet_balance: safeNextBalance })
    .eq('id', userId)
    .select('id, role, wallet_balance')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const addedAmountRaw = parsed.data.wallet_amount != null
    ? Number(parsed.data.wallet_amount ?? 0)
    : Math.max(0, safeNextBalance - currentBalance)

  if (addedAmountRaw > 0) {
    try {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', profile.id)
        .maybeSingle()
      const actorFullName = String((actorProfile as any)?.full_name ?? '').trim()
        || String((actorProfile as any)?.email ?? '').trim()
        || 'Operator'
      const addedAmountText = Number(addedAmountRaw).toLocaleString('en-US', { maximumFractionDigits: 2 })
      const message = `${addedAmountText} amount was added to your wallet by ${actorFullName}`
      const recipientRole = String((data as any)?.role ?? '').trim()

      await notifyUser(event, {
        user_id: String(userId),
        actor_id: profile.id,
        kind: 'wallet_added',
        title: 'Your Wallet',
        message,
        target_url: '/member',
        payload: {
          added_amount: addedAmountRaw,
          wallet_balance: Number((data as any)?.wallet_balance ?? 0),
        },
        send_push: ['member', 'staff', 'admin', 'superadmin'].includes(recipientRole),
        recipient_role: ['member', 'staff', 'admin', 'superadmin'].includes(recipientRole) ? recipientRole as any : null,
        push_title: 'Your Wallet',
        push_body: message,
        push_tag: 'wallet-added',
      })
    }
    catch {
      // Notification is best-effort and must not block wallet update.
    }
  }

  return data
})
