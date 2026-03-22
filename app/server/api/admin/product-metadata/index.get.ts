import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const listQuerySchema = z.object({
  table: z.enum(['brands', 'categories', 'tags']).optional(),
  search: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortKey: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

const allowedSortKeys: Record<'brands' | 'categories' | 'tags', string[]> = {
  brands: ['name', 'slug', 'is_active', 'created_at'],
  categories: ['name', 'slug', 'sort_order', 'is_active', 'created_at'],
  tags: ['name', 'slug', 'created_at'],
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const parsed = listQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)

  if (parsed.data.table) {
    const { table, search, page, pageSize, sortKey, sortOrder } = parsed.data
    const normalizedSortKey = allowedSortKeys[table].includes(sortKey) ? sortKey : 'name'
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .order(normalizedSortKey, { ascending: sortOrder === 'asc', nullsFirst: false })
      .order('name', { ascending: true })

    const q = search.trim()
    if (q) {
      const escaped = q.replace(/,/g, ' ')
      query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`)
    }

    const { data, error, count } = await query.range(from, to)
    if (error)
      throw createError({ statusCode: 500, message: error.message })

    if (table === 'categories') {
      const rows = (data ?? []) as any[]
      const parentIds = [...new Set(rows.map(row => String(row.parent_id ?? '')).filter(Boolean))]
      let parentNameById: Record<string, string> = {}
      if (parentIds.length) {
        const { data: parentRows, error: parentError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', parentIds)
        if (parentError)
          throw createError({ statusCode: 500, message: parentError.message })
        parentNameById = Object.fromEntries((parentRows ?? []).map(row => [row.id, row.name]))
      }

      return {
        items: rows.map(row => ({
          ...row,
          parent_name: parentNameById[String(row.parent_id ?? '')] ?? '-',
        })),
        total: count ?? 0,
        page,
        pageSize,
      }
    }

    return {
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  const [brandsRes, categoriesRes, tagsRes] = await Promise.all([
    supabase.from('brands').select('*').order('name'),
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('tags').select('*').order('name'),
  ])

  if (brandsRes.error) throw createError({ statusCode: 500, message: brandsRes.error.message })
  if (categoriesRes.error) throw createError({ statusCode: 500, message: categoriesRes.error.message })
  if (tagsRes.error) throw createError({ statusCode: 500, message: tagsRes.error.message })

  return {
    brands: brandsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    tags: tagsRes.data ?? [],
  }
})
