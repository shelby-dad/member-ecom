import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])
  const canUsePersistentMemberCart = profile.baseRole === 'member' || Boolean(profile.onBehalf?.id)
  if (!canUsePersistentMemberCart)
    return []

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('member_cart_items')
    .select('variant_id, product_name, variant_name, price, quantity, updated_at')
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return (data ?? []).map((row: any) => ({
    variant_id: row.variant_id,
    product_name: String(row.product_name ?? ''),
    variant_name: String(row.variant_name ?? ''),
    price: Number(row.price ?? 0),
    quantity: Number(row.quantity ?? 0),
  }))
})
