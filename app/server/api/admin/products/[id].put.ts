import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { syncProductCategories, syncProductTags } from '~/server/utils/product-metadata'

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
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().min(3).max(64).optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  category_ids: z.array(z.string().uuid()).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
  track_stock: z.boolean().optional(),
  has_variants: z.boolean().optional(),
  option_sets: z.array(optionSetSchema).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })
  if (profile.role === 'staff' && parsed.data.is_active === false)
    throw createError({ statusCode: 403, message: 'Staff cannot set product inactive' })

  const supabase = await getServiceRoleClient(event)
  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.slug !== undefined) updates.slug = parsed.data.slug
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.barcode !== undefined) updates.barcode = parsed.data.barcode?.trim() || null
  if (parsed.data.brand_id !== undefined) updates.brand_id = parsed.data.brand_id ?? null
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active
  if (parsed.data.track_stock !== undefined) updates.track_stock = parsed.data.track_stock
  if (parsed.data.has_variants !== undefined) updates.has_variants = parsed.data.has_variants
  if (parsed.data.option_sets !== undefined) updates.option_sets = parsed.data.option_sets

  if (parsed.data.barcode !== undefined && parsed.data.barcode?.trim()) {
    const barcode = parsed.data.barcode.trim()
    const { data: existing, error: existsError } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .neq('id', id)
      .limit(1)
    if (existsError)
      throw createError({ statusCode: 500, message: existsError.message })
    if (existing?.length)
      throw createError({ statusCode: 409, message: 'Barcode already exists' })
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (parsed.data.category_ids !== undefined)
    await syncProductCategories(supabase, id, parsed.data.category_ids)
  if (parsed.data.tag_ids !== undefined)
    await syncProductTags(supabase, id, parsed.data.tag_ids)
  return data
})
