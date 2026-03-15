import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedPromotion {
  promo: any | null
  discount: number
}

export async function resolvePromotionForOrder(
  supabase: SupabaseClient,
  params: {
    promoId?: string | null
    userId: string
    subtotal: number
  },
): Promise<ResolvedPromotion> {
  const promoId = params.promoId ?? null
  if (!promoId)
    return { promo: null, discount: 0 }

  const { data: promo, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', promoId)
    .single()
  if (promoError || !promo)
    throw createError({ statusCode: 400, message: 'Invalid promotion' })
  if (!promo.is_active)
    throw createError({ statusCode: 400, message: 'Promotion is inactive' })

  const now = new Date()
  if (promo.starts_at && new Date(promo.starts_at) > now)
    throw createError({ statusCode: 400, message: 'Promotion has not started' })
  if (promo.ends_at && new Date(promo.ends_at) < now)
    throw createError({ statusCode: 400, message: 'Promotion has expired' })
  if (Number(params.subtotal) < Number(promo.min_subtotal ?? 0))
    throw createError({ statusCode: 400, message: 'Order does not meet promotion minimum subtotal' })

  if (promo.usage_limit) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('promo_id', promo.id)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
    if ((count ?? 0) >= promo.usage_limit)
      throw createError({ statusCode: 400, message: 'Promotion usage limit reached' })
  }

  if (promo.per_user_limit) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('promo_id', promo.id)
      .eq('user_id', params.userId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
    if ((count ?? 0) >= promo.per_user_limit)
      throw createError({ statusCode: 400, message: 'You have reached the promotion limit' })
  }

  const subtotal = Number(params.subtotal)
  let discount = promo.discount_type === 'percent'
    ? (subtotal * Number(promo.discount_value)) / 100
    : Number(promo.discount_value)
  if (promo.max_discount != null)
    discount = Math.min(discount, Number(promo.max_discount))
  discount = Math.max(0, Math.min(discount, subtotal))

  return { promo, discount }
}

