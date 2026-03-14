import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { generateOptionCombinations, optionValuesToName } from '~/server/utils/product-variants'
import { ensureStockRow } from '~/server/utils/stock'

const optionSetSchema = z.object({ name: z.string().min(1), values: z.array(z.string().min(1)).min(1) })
const bodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  has_variants: z.boolean().default(false),
  option_sets: z.array(optionSetSchema).optional().default([]),
  default_variant: z.object({
    name: z.string().optional(),
    price: z.number().min(0),
    stock: z.number().int().min(0).optional(),
  }).optional(),
  variants: z.array(z.object({
    option_values: z.record(z.string(), z.string()),
    sku: z.string().optional(),
    price: z.number().min(0),
    stock: z.number().int().min(0).optional(),
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const slug = parsed.data.slug ?? parsed.data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
      is_active: parsed.data.is_active,
      has_variants: parsed.data.has_variants,
      option_sets: parsed.data.option_sets,
      created_by: profile.id,
    })
    .select('id, name, slug, description, is_active, has_variants, option_sets, created_at')
    .single()

  if (productError || !product)
    throw createError({ statusCode: 500, message: productError?.message ?? 'Product insert failed' })

  const productId = product.id
  const optionSetOrder = parsed.data.option_sets.map((o: { name: string }) => o.name)

  if (!parsed.data.has_variants && parsed.data.default_variant) {
    const v = parsed.data.default_variant
    const name = v.name?.trim() || 'Default'
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        name,
        price: v.price,
        option_values: null,
        sort_order: 0,
      })
      .select()
      .single()
    if (variantError)
      throw createError({ statusCode: 500, message: variantError.message })
    await ensureStockRow(supabase, variant.id, v.stock ?? 0)
    return { ...product, variants: [variant] }
  }

  if (parsed.data.has_variants) {
    const combinations = parsed.data.variants?.length
      ? parsed.data.variants.map(v => v.option_values)
      : generateOptionCombinations(parsed.data.option_sets)
    const variants: any[] = []
    let sortOrder = 0
    for (const optionValues of combinations) {
      const payload = parsed.data.variants?.find(
        x => Object.keys(optionValues).every(k => (x.option_values as Record<string, string>)[k] === optionValues[k]),
      )
      const price = payload?.price ?? 0
      const stock = payload?.stock ?? 0
      const sku = payload?.sku ?? null
      const name = optionValuesToName(optionValues, optionSetOrder)
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          name,
          sku,
          price,
          option_values: optionValues,
          sort_order: sortOrder++,
        })
        .select()
        .single()
      if (variantError)
        throw createError({ statusCode: 500, message: variantError.message })
      await ensureStockRow(supabase, variant.id, stock)
      variants.push(variant)
    }
    return { ...product, variants }
  }

  return product
})
