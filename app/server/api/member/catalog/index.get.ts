import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  q: z.string().optional(),
  brand_id: z.string().uuid().optional(),
  category_ids: z.string().optional(),
  tag_ids: z.string().optional(),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc']).optional().default('relevance'),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(36).optional().default(12),
})

function parseCsvToUuidArray(input?: string) {
  if (!input) return []
  return input.split(',').map(s => s.trim()).filter(Boolean)
}

function firstOptionImagePath(optionSets: any): string {
  const sets = Array.isArray(optionSets) ? optionSets : []
  for (const set of sets) {
    if ((set?.type ?? 'text') !== 'image') continue
    const values = Array.isArray(set?.values) ? set.values : []
    for (const raw of values) {
      const path = typeof raw === 'string'
        ? raw.trim()
        : String(raw?.value ?? '').trim()
      if (path) return path
    }
  }
  return ''
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const q = parsed.data.q?.trim() || null
  const categoryIds = parseCsvToUuidArray(parsed.data.category_ids)
  const tagIds = parseCsvToUuidArray(parsed.data.tag_ids)
  const page = parsed.data.page
  const perPage = parsed.data.per_page
  const offset = (page - 1) * perPage

  const supabase = await getServiceRoleClient(event)
  const { data: rows, error } = await supabase.rpc('search_catalog_products', {
    p_query: q,
    p_brand_id: parsed.data.brand_id ?? null,
    p_category_ids: categoryIds.length ? categoryIds : null,
    p_tag_ids: tagIds.length ? tagIds : null,
    p_price_min: parsed.data.price_min ?? null,
    p_price_max: parsed.data.price_max ?? null,
    p_sort: parsed.data.sort,
    p_limit: perPage + 1,
    p_offset: offset,
  })
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const list = (rows as any[]) ?? []
  const hasMore = list.length > perPage
  const slice = hasMore ? list.slice(0, perPage) : list
  const ids = slice.map(p => p.id)

  const { data: images, error: imageError } = ids.length
    ? await supabase
      .from('product_images')
      .select('product_id, path')
      .in('product_id', ids)
      .order('sort_order', { ascending: true })
    : { data: [], error: null }
  if (imageError)
    throw createError({ statusCode: 500, message: imageError.message })

  const firstImageByProduct: Record<string, string> = {}
  for (const img of (images as any[]) ?? []) {
    if (firstImageByProduct[img.product_id] == null)
      firstImageByProduct[img.product_id] = img.path
  }

  const items = slice.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    brand_id: p.brand_id,
    min_price: Number(p.min_price ?? 0),
    relevance: Number(p.relevance ?? 0),
    image_path: firstImageByProduct[p.id] || firstOptionImagePath(p.option_sets),
  }))

  return {
    items,
    page,
    per_page: perPage,
    has_more: hasMore,
  }
})

