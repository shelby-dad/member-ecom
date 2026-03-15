import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const productId = getRouterParam(event, 'id')
  if (!productId)
    throw createError({ statusCode: 400, message: 'Missing product id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  for (const item of parsed.data.items) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('product_id', productId)
    if (error)
      throw createError({ statusCode: 500, message: error.message })
  }
  return { ok: true }
})
