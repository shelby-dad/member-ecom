import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { generateOptionCombinations, generateVariantSku, normalizeOptionSets, optionValuesToName } from '~/server/utils/product-variants'
import { ensureStockRow } from '~/server/utils/stock'
import { syncProductCategories, syncProductTags } from '~/server/utils/product-metadata'
import { generateUniqueProductBarcode } from '~/server/utils/barcode'

const optionValueSchema = z.union([
  z.string().min(1),
  z.object({ label: z.string().min(1), value: z.string().min(1) }),
])
const optionSetSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'image', 'color']).optional(),
  values: z.array(optionValueSchema).min(1),
})
const bodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().min(3).max(64).optional(),
  brand_id: z.string().uuid().optional().nullable(),
  category_ids: z.array(z.string().uuid()).optional().default([]),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
  is_active: z.boolean().optional().default(true),
  track_stock: z.boolean().optional().default(true),
  has_variants: z.boolean().default(false),
  option_sets: z.array(optionSetSchema).optional().default([]),
  default_variant: z.object({
    name: z.string().optional(),
    price: z.number().min(0),
    stock: z.number().int().min(0).optional(),
    track_stock: z.boolean().optional(),
  }).optional(),
  variants: z.array(z.object({
    option_values: z.record(z.string(), z.string()),
    sku: z.string().optional(),
    price: z.number().min(0),
    stock: z.number().int().min(0).optional(),
    track_stock: z.boolean().optional(),
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })
  if (profile.role === 'staff' && parsed.data.is_active === false) {
    throw createError({ statusCode: 403, message: 'Staff cannot set product inactive' })
  }

  const supabase = await getServiceRoleClient(event)
  const slug = parsed.data.slug ?? parsed.data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const normalizedOptionSets = normalizeOptionSets(parsed.data.option_sets)
  let barcode = parsed.data.barcode?.trim()
  if (barcode) {
    const { data: existing, error: existsError } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .limit(1)
    if (existsError)
      throw createError({ statusCode: 500, message: existsError.message })
    if (existing?.length)
      throw createError({ statusCode: 409, message: 'Barcode already exists' })
  } else {
    const generated = await generateUniqueProductBarcode(event, supabase)
    barcode = generated.barcode
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
      barcode,
      brand_id: parsed.data.brand_id ?? null,
      is_active: parsed.data.is_active,
      track_stock: parsed.data.track_stock,
      has_variants: parsed.data.has_variants,
      option_sets: normalizedOptionSets,
      created_by: profile.id,
    })
    .select('id, name, slug, description, barcode, is_active, track_stock, has_variants, option_sets, created_at')
    .single()

  if (productError || !product)
    throw createError({ statusCode: 500, message: productError?.message ?? 'Product insert failed' })

  const productId = product.id
  await syncProductCategories(supabase, productId, parsed.data.category_ids ?? [])
  await syncProductTags(supabase, productId, parsed.data.tag_ids ?? [])
  const optionSetOrder = normalizedOptionSets.map(o => o.name)

  if (!parsed.data.has_variants && parsed.data.default_variant) {
    const v = parsed.data.default_variant
    const name = v.name?.trim() || 'Default'
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        name,
        sku: generateVariantSku(slug, { Default: name }),
        price: v.price,
        track_stock: v.track_stock ?? parsed.data.track_stock,
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
      : generateOptionCombinations(normalizedOptionSets)
    const variants: any[] = []
    let sortOrder = 0
    for (const optionValues of combinations) {
      const payload = parsed.data.variants?.find(
        x => Object.keys(optionValues).every(k => (x.option_values as Record<string, string>)[k] === optionValues[k]),
      )
      const price = payload?.price ?? 0
      const stock = payload?.stock ?? 0
      const trackStock = payload?.track_stock ?? parsed.data.track_stock
      const sku = payload?.sku?.trim() || generateVariantSku(slug, optionValues)
      const name = optionValuesToName(optionValues, optionSetOrder)
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          name,
          sku,
          price,
          track_stock: trackStock,
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
