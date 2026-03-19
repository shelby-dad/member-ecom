import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { applyOrderStock } from '~/server/utils/order-stock'
import { resolvePromotionForOrder } from '~/server/utils/promotions'
import { generateUniqueOrderNumber } from '~/server/utils/order-number'
import { generateUniqueInvoiceNumber } from '~/server/utils/invoice-number'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import {
  aggregateQuantityByVariant,
  aggregateStockByVariant,
  normalizeCheckoutItems,
  toOrderItemsRows,
} from '~/server/utils/order-checkout'

const bodySchema = z.object({
  user_id: z.string().uuid(),
  payment_method_id: z.string().uuid(),
  transaction_id: z.string().optional(),
  slip_path: z.string().optional(),
  promo_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional(),
  items: z.array(z.object({
    variant_id: z.string().uuid(),
    product_name: z.string().optional(),
    variant_name: z.string().optional(),
    price: z.number().min(0).optional(),
    quantity: z.number().int().min(1),
  })),
  shipping_name: z.string().optional(),
  shipping_line1: z.string().optional(),
  shipping_line2: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
})

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])
  enforceRateLimit(event, {
    bucket: 'orders:create:pos',
    limit: 60,
    windowMs: 60_000,
    scope: profile.id,
  })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)

  const { data: paymentMethod, error: paymentMethodError } = await supabase
    .from('payment_methods')
    .select('id, type, is_active')
    .eq('id', parsed.data.payment_method_id)
    .limit(1)
    .maybeSingle()

  if (paymentMethodError || !paymentMethod || !paymentMethod.is_active) {
    throw createError({ statusCode: 400, message: 'Invalid or inactive payment method' })
  }

  const quantityByVariantId = aggregateQuantityByVariant(parsed.data.items)
  const variantIds = [...quantityByVariantId.keys()]
  const { data: activeVariants, error: activeVariantsError } = await supabase
    .from('product_variants')
    .select('id, name, price, track_stock, products!inner(name, is_active, has_variants, track_stock)')
    .in('id', variantIds)
    .eq('products.is_active', true)

  if (activeVariantsError)
    throw createError({ statusCode: 500, message: activeVariantsError.message })

  const { data: stockRows, error: stockError } = variantIds.length
    ? await supabase.from('stock').select('variant_id, quantity').in('variant_id', variantIds)
    : { data: [], error: null }
  if (stockError)
    throw createError({ statusCode: 500, message: stockError.message })

  const stockByVariantId = aggregateStockByVariant((stockRows as any[]) ?? [])
  const normalizedItems = normalizeCheckoutItems(
    quantityByVariantId,
    (activeVariants as any[]) ?? [],
    stockByVariantId,
    {
      inactiveCartMessage: 'Cart has inactive products. Please refresh POS items.',
      invalidVariantPriceMessage: 'Cart has invalid variant prices. Please refresh POS items.',
    },
  )

  const subtotal = normalizedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const promotion = await resolvePromotionForOrder(supabase, {
    promoId: parsed.data.promo_id ?? null,
    userId: parsed.data.user_id,
    subtotal,
  })
  const discountTotal = promotion.discount
  const total = Math.max(0, subtotal - discountTotal)
  const isCash = paymentMethod.type === 'cash'
  const isBankTransfer = paymentMethod.type === 'bank_transfer'
  const isWallet = paymentMethod.type === 'wallet'
  const isCod = paymentMethod.type === 'cod'
  const paidAt = (isCash || isBankTransfer || isWallet) ? new Date().toISOString() : null
  if (isWallet) {
    const { data: walletRow, error: walletError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', parsed.data.user_id)
      .limit(1)
      .maybeSingle()
    if (walletError)
      throw createError({ statusCode: 500, message: walletError.message })
    if (!walletRow)
      throw createError({ statusCode: 400, message: 'Member profile not found for wallet payment.' })
    if (total > Number(walletRow?.wallet_balance ?? 0))
      throw createError({ statusCode: 400, message: 'Member wallet balance is insufficient.' })
  }
  const orderNumber = await generateUniqueOrderNumber(supabase)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: parsed.data.user_id,
      source: 'POS Order',
      branch_id: parsed.data.branch_id ?? null,
      status: (isCash || isBankTransfer) ? 'delivered' : ((isWallet || isCod) ? 'confirmed' : 'pending'),
      payment_status: (isCash || isBankTransfer || isWallet) ? 'paid' : 'pending',
      paid_at: paidAt,
      payment_method_type: paymentMethod.type,
      shipping_name: parsed.data.shipping_name ?? null,
      shipping_line1: parsed.data.shipping_line1 ?? null,
      shipping_line2: parsed.data.shipping_line2 ?? null,
      shipping_city: parsed.data.shipping_city ?? null,
      shipping_state: parsed.data.shipping_state ?? null,
      shipping_postal_code: parsed.data.shipping_postal_code ?? null,
      shipping_country: parsed.data.shipping_country ?? null,
      subtotal,
      discount_total: discountTotal,
      total,
      promo_id: promotion.promo?.id ?? null,
      created_by_staff: profile.id,
    })
    .select()
    .limit(1)
    .maybeSingle()

  if (orderError || !order)
    throw createError({ statusCode: 500, message: orderError?.message ?? 'Failed to create order' })

  const orderItems = toOrderItemsRows(order.id, normalizedItems)

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError)
    throw createError({ statusCode: 500, message: itemsError.message })

  try {
    await applyOrderStock(supabase, {
      orderId: order.id,
      actorId: profile.id,
      items: normalizedItems,
      action: 'reserve',
    })
    await supabase.from('orders').update({ stock_applied: true }).eq('id', order.id)
  }
  catch (e: any) {
    await supabase.from('orders').delete().eq('id', order.id)
    const msg = e?.message ?? 'Failed to reserve stock for order'
    if (String(msg).toLowerCase().includes('stock'))
      throw createError({ statusCode: 400, message: 'Stock changed while creating order. Please refresh POS items and try again.' })
    throw createError({ statusCode: 400, message: msg })
  }

  const { error: submissionError } = await supabase
    .from('payment_submissions')
    .insert({
      invoice_number: await generateUniqueInvoiceNumber(supabase),
      order_id: order.id,
      payment_method_id: parsed.data.payment_method_id,
      user_id: parsed.data.user_id,
      amount: total,
      transaction_id: parsed.data.transaction_id?.trim() || null,
      slip_path: parsed.data.slip_path?.trim() || null,
      status: (isCash || isBankTransfer || isWallet) ? 'verified' : 'pending',
      verified_at: (isCash || isBankTransfer || isWallet) ? new Date().toISOString() : null,
      verified_by: (isCash || isBankTransfer || isWallet) ? profile.id : null,
      notes: isCod ? 'Cash on delivery' : (isCash ? 'Paid by cash at POS' : null),
    })

  if (submissionError)
    throw createError({ statusCode: 500, message: submissionError.message })

  if (isWallet) {
    const { data: walletSnapshot, error: walletSnapshotError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', parsed.data.user_id)
      .limit(1)
      .maybeSingle()
    if (walletSnapshotError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw createError({ statusCode: 500, message: walletSnapshotError.message })
    }
    if (!walletSnapshot) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw createError({ statusCode: 400, message: 'Member profile not found for wallet payment.' })
    }
    const current = Number(walletSnapshot?.wallet_balance ?? 0)
    if (current < total) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw createError({ statusCode: 400, message: 'Member wallet balance is insufficient.' })
    }
    const next = Math.max(0, Number((current - total).toFixed(2)))
    const { error: walletUpdateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: next })
      .eq('id', parsed.data.user_id)
    if (walletUpdateError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw createError({ statusCode: 500, message: walletUpdateError.message })
    }
  }

  return { ...order, items: orderItems }
})
