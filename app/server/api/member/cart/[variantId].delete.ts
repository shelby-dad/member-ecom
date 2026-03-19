import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const paramsSchema = z.object({
  variantId: z.string().uuid(),
})

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])
  const canUsePersistentMemberCart = profile.baseRole === 'member' || Boolean(profile.onBehalf?.id)
  if (!canUsePersistentMemberCart)
    return { ok: true, ignored: true }

  const parsedParams = paramsSchema.safeParse(event.context.params ?? {})
  if (!parsedParams.success)
    throw createError({ statusCode: 400, message: parsedParams.error.message })

  const supabase = await getServiceRoleClient(event)
  const { error } = await supabase
    .from('member_cart_items')
    .delete()
    .eq('user_id', profile.id)
    .eq('variant_id', parsedParams.data.variantId)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
