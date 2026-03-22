import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { withSignedPaymentSlipUrls } from '~/server/utils/payment-slip'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const supabase = await getServiceRoleClient(event)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (orderError)
    throw createError({ statusCode: 500, message: orderError.message })
  if (!order)
    throw createError({ statusCode: 404, message: 'Order not found' })

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  if (itemsError)
    throw createError({ statusCode: 500, message: itemsError.message })

  const [{ data: paymentMethods, error: paymentMethodsError }, { data: submissions, error: submissionsError }] = await Promise.all([
    supabase
      .from('payment_methods')
      .select('id, name, type, is_active')
      .eq('is_active', true)
      .eq('type', 'bank_transfer')
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('payment_submissions')
      .select('id, invoice_number, amount, transaction_id, slip_path, status, created_at, payment_method_id, payment_methods(name, type)')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (paymentMethodsError)
    throw createError({ statusCode: 500, message: paymentMethodsError.message })
  if (submissionsError)
    throw createError({ statusCode: 500, message: submissionsError.message })

  const signedSubmissions = await withSignedPaymentSlipUrls(supabase, (submissions ?? []) as any[])

  return {
    order,
    items: items ?? [],
    paymentMethods: paymentMethods ?? [],
    submissions: signedSubmissions,
  }
})
