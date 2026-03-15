import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select('id, is_active')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (!data)
    throw createError({ statusCode: 404, message: 'Product not found' })

  return {
    ok: true,
    product: data,
  }
})
