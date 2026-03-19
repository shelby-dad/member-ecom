import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  option_names: z.array(z.string().min(1)).min(1),
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

  const optionNames = [...new Set(parsed.data.option_names.map(v => v.trim()).filter(Boolean))]
  if (!optionNames.length)
    return { removed_count: 0 }

  const supabase = await getServiceRoleClient(event)
  const { data: variants, error: queryError } = await supabase
    .from('product_variants')
    .select('id, option_values')
    .eq('product_id', productId)

  if (queryError)
    throw createError({ statusCode: 500, message: queryError.message })

  const removeIds = (variants ?? [])
    .filter((variant: any) => {
      const optionValues = variant?.option_values && typeof variant.option_values === 'object'
        ? variant.option_values
        : {}
      const keys = Object.keys(optionValues)
      return keys.some(key => optionNames.includes(key))
    })
    .map((variant: any) => variant.id)

  if (!removeIds.length)
    return { removed_count: 0 }

  const { error: deleteError } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId)
    .in('id', removeIds)

  if (deleteError)
    throw createError({ statusCode: 400, message: deleteError.message })

  return { removed_count: removeIds.length }
})
