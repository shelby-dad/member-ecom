import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { ensureStockRow } from '~/server/utils/stock'

const bodySchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).optional().nullable(),
  option_values: z.record(z.string(), z.string()).optional(),
  sort_order: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const productId = getRouterParam(event, 'id')
  if (!productId)
    throw createError({ statusCode: 400, message: 'Missing product id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      price: parsed.data.price,
      compare_at_price: parsed.data.compare_at_price ?? null,
      option_values: parsed.data.option_values ?? null,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  await ensureStockRow(supabase, data.id, 0)
  return data
})
