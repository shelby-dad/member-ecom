import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const productId = getRouterParam(event, 'id')
  const imageId = getRouterParam(event, 'imageId')
  if (!productId || !imageId)
    throw createError({ statusCode: 400, message: 'Missing id or imageId' })

  const supabase = await getServiceRoleClient(event)
  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId)

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})
