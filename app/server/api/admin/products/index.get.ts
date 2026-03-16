import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

function parseCsvToUuidArray(input: unknown) {
  const value = String(input ?? '').trim()
  if (!value) return []
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

function countOptionImageValues(optionSets: unknown) {
  const sets = Array.isArray(optionSets) ? optionSets : []
  let count = 0
  for (const set of sets as any[]) {
    if ((set?.type ?? 'text') !== 'image') continue
    const values = Array.isArray(set?.values) ? set.values : []
    for (const raw of values) {
      if (typeof raw === 'string') {
        if (raw.trim()) count += 1
        continue
      }
      const value = String(raw?.value ?? '').trim()
      if (value) count += 1
    }
  }
  return count
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const queryParams = getQuery(event)
  const q = String(queryParams.q ?? '').trim()
  const categoryIds = parseCsvToUuidArray(queryParams.category_ids)
  const tagIds = parseCsvToUuidArray(queryParams.tag_ids)
  const sortByInput = String(queryParams.sort_by ?? '').trim()
  const sortOrderInput = String(queryParams.sort_order ?? '').trim().toLowerCase()
  const allowedSortColumns = ['name', 'is_active', 'created_at', 'updated_at'] as const
  const sortBy = allowedSortColumns.includes(sortByInput as any) ? sortByInput : 'created_at'
  const sortAscending = sortOrderInput === 'asc'
  const page = Math.max(1, Number(queryParams.page ?? 1) || 1)
  const perPageRaw = Number(queryParams.per_page ?? 25) || 25
  const perPage = [25, 50, 100].includes(perPageRaw) ? perPageRaw : 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = await getServiceRoleClient(event)
  let eligibleProductIds: string[] | null = null

  if (categoryIds.length) {
    const { data, error } = await supabase
      .from('product_categories')
      .select('product_id')
      .in('category_id', categoryIds)
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    eligibleProductIds = [...new Set((data ?? []).map((row: any) => row.product_id).filter(Boolean))]
  }

  if (tagIds.length) {
    const { data, error } = await supabase
      .from('product_tags')
      .select('product_id')
      .in('tag_id', tagIds)
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    const tagProductIds = new Set((data ?? []).map((row: any) => row.product_id).filter(Boolean))
    eligibleProductIds = eligibleProductIds == null
      ? [...tagProductIds]
      : eligibleProductIds.filter(id => tagProductIds.has(id))
  }

  if (eligibleProductIds != null && eligibleProductIds.length === 0) {
    return {
      items: [],
      page,
      per_page: perPage,
      total: 0,
      total_pages: 1,
    }
  }

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortAscending })

  if (profile.role !== 'superadmin')
    query = query.eq('is_active', true)
  if (q)
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,barcode.ilike.%${q}%`)
  if (eligibleProductIds != null)
    query = query.in('id', eligibleProductIds)
  query = query.range(from, to)

  const { data: products, error, count } = await query
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const list = products ?? []
  if (list.length === 0)
    return {
      items: [],
      page,
      per_page: perPage,
      total: count ?? 0,
      total_pages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
    }

  const ids = list.map((p: { id: string }) => p.id)
  const [varRes, imgRes] = await Promise.all([
    supabase.from('product_variants').select('product_id, price').in('product_id', ids),
    supabase.from('product_images').select('product_id').in('product_id', ids),
  ])
  const variantCount: Record<string, number> = {}
  const imageCount: Record<string, number> = {}
  const priceMin: Record<string, number> = {}
  const priceMax: Record<string, number> = {}
  for (const v of varRes.data ?? []) {
    variantCount[v.product_id] = (variantCount[v.product_id] ?? 0) + 1
    const price = Number(v.price)
    if (Number.isNaN(price) || price === 0)
      continue
    priceMin[v.product_id] = priceMin[v.product_id] == null ? price : Math.min(priceMin[v.product_id], price)
    priceMax[v.product_id] = priceMax[v.product_id] == null ? price : Math.max(priceMax[v.product_id], price)
  }
  for (const i of imgRes.data ?? [])
    imageCount[i.product_id] = (imageCount[i.product_id] ?? 0) + 1

  const items = list.map((p: any) => ({
    ...p,
    variant_count: variantCount[p.id] ?? 0,
    image_count: (imageCount[p.id] ?? 0) + countOptionImageValues(p.option_sets),
    price_min: priceMin[p.id] ?? null,
    price_max: priceMax[p.id] ?? null,
  }))

  const total = count ?? 0
  return {
    items,
    page,
    per_page: perPage,
    total,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
})
