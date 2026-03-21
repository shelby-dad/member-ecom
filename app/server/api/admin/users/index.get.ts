import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortKey: z.enum(['full_name', 'email', 'mobile_number', 'role', 'status', 'wallet_balance', 'created_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const { search, page, pageSize, sortKey, sortOrder } = parsed.data
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await getServiceRoleClient(event)
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, mobile_number, is_mobile_logged_in, role, status, wallet_balance, created_at', { count: 'exact' })
    .order(sortKey, { ascending: sortOrder === 'asc', nullsFirst: false })
    .order('created_at', { ascending: false })

  if (search.trim()) {
    const q = search.trim().replace(/,/g, ' ')
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,mobile_number.ilike.%${q}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  }
})
