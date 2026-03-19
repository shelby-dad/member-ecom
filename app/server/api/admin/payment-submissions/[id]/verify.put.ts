import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

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
  }
  return data
})
