import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { notifyUser } from '~/server/services/notifications/user-notifications'
import { isMemberOrderSource } from '~/server/utils/order-source'

const bodySchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('payment_submissions')
    .update({
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      verified_at: new Date().toISOString(),
      verified_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  if (data?.order_id) {
    const isVerified = parsed.data.status === 'verified'
    await supabase
      .from('orders')
      .update({
        payment_status: isVerified ? 'paid' : 'failed',
        paid_at: isVerified ? new Date().toISOString() : null,
        status: isVerified ? 'confirmed' : 'pending',
      })
      .eq('id', data.order_id)

    if (isVerified) {
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('id, user_id, source')
          .eq('id', data.order_id)
          .maybeSingle()
        const userId = String((orderRow as any)?.user_id ?? '').trim()
        const isMemberSource = isMemberOrderSource((orderRow as any)?.source)
        if (isMemberSource && userId) {
          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle()
          const recipientRole = String((recipientProfile as any)?.role ?? '').trim()
          const invoiceNumber = String((data as any)?.invoice_number ?? '').trim() || String(id)
          const message = `Your Invoice ${invoiceNumber} was verified to Paid.`
          await notifyUser(event, {
            user_id: userId,
            actor_id: profile.id,
            kind: 'order_payment_verified',
            title: 'Payment verified',
            message,
            target_url: `/member/orders/${data.order_id}`,
            payload: {
              order_id: data.order_id,
              invoice_number: invoiceNumber,
            },
            send_push: recipientRole === 'member',
            recipient_role: recipientRole === 'member' ? 'member' : null,
            push_title: 'Payment verified',
            push_body: message,
            push_tag: 'payment-verified',
          })
        }
      }
      catch {
        // Notification is best-effort and must not block verification.
      }
    }
  }
  return data
})
