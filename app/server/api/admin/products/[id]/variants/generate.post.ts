import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { generateOptionCombinations, optionValuesToName } from '~/server/utils/product-variants'
import { ensureStockRow } from '~/server/utils/stock'

const bodySchema = z.object({
  option_sets: z.array(z.object({ name: z.string().min(1), values: z.array(z.string().min(1)).min(1) })).optional(),
}).optional()

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const productId = getRouterParam(event, 'id')
  if (!productId)
    throw createError({ statusCode: 400, message: 'Missing product id' })

  const supabase = await getServiceRoleClient(event)
  const { data: product } = await supabase.from('products').select('option_sets').eq('id', productId).single()
  if (!product)
    throw createError({ statusCode: 404, message: 'Product not found' })

  const body = await readBody(event).catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  const optionSets = parsed.success && parsed.data?.option_sets?.length
    ? parsed.data.option_sets
    : (product.option_sets as Array<{ name: string; values: string[] }>) ?? []

  if (optionSets.length === 0)
    throw createError({ statusCode: 400, message: 'No option_sets to generate variants' })

  const combinations = generateOptionCombinations(optionSets)
  const optionSetOrder = optionSets.map(o => o.name)

  const { data: existing } = await supabase
    .from('product_variants')
    .select('id, option_values')
    .eq('product_id', productId)

  const existingKeys = new Set((existing ?? []).map((v: any) => JSON.stringify(v.option_values ?? {})))
  const toCreate = combinations.filter(ov => !existingKeys.has(JSON.stringify(ov)))

  const created: any[] = []
  let sortOrder = (existing?.length ?? 0)
  for (const optionValues of toCreate) {
    const name = optionValuesToName(optionValues, optionSetOrder)
    const { data: variant, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        name,
        price: 0,
        option_values: optionValues,
        sort_order: sortOrder++,
      })
      .select()
      .single()
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    await ensureStockRow(supabase, variant.id, 0)
    created.push(variant)
  }
  return { created }
})
