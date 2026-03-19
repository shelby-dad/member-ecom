import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(0),
  product_name: z.string().optional(),
  variant_name: z.string().optional(),
  price: z.number().min(0).optional(),
})

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])
  const canUsePersistentMemberCart = profile.baseRole === 'member' || Boolean(profile.onBehalf?.id)
  if (!canUsePersistentMemberCart)
    return { ok: true, ignored: true }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  if (parsed.data.quantity <= 0) {
    const { error: deleteError } = await supabase
      .from('member_cart_items')
      .delete()
      .eq('user_id', profile.id)
      .eq('variant_id', parsed.data.variant_id)
    if (deleteError)
      throw createError({ statusCode: 500, message: deleteError.message })
    return { ok: true }
  }

  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .select('id, name, price, products!inner(name, has_variants, is_active)')
    .eq('id', parsed.data.variant_id)
    .eq('products.is_active', true)
    .maybeSingle()
  if (variantError)
    throw createError({ statusCode: 500, message: variantError.message })
  if (!variant)
    throw createError({ statusCode: 404, message: 'Variant not found' })

  const effectivePrice = Number(parsed.data.price ?? variant.price ?? 0)
  if (Boolean((variant as any).products?.has_variants) && effectivePrice <= 0)
    throw createError({ statusCode: 400, message: 'Invalid variant price for cart item.' })

  const { error: upsertError } = await supabase
    .from('member_cart_items')
    .upsert({
      user_id: profile.id,
      variant_id: parsed.data.variant_id,
      product_name: parsed.data.product_name?.trim() || String((variant as any).products?.name ?? ''),
      variant_name: parsed.data.variant_name?.trim() || String((variant as any).name ?? ''),
      price: effectivePrice,
      quantity: parsed.data.quantity,
    }, { onConflict: 'user_id,variant_id' })

  if (upsertError)
    throw createError({ statusCode: 500, message: upsertError.message })

  return { ok: true }
})
