import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

function escLike(input: string) {
  return input.replace(/[%_]/g, char => `\\${char}`)
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const perPageRaw = Number(query.per_page ?? 20) || 20
  const perPage = [10, 20, 30, 50].includes(perPageRaw) ? perPageRaw : 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = await getServiceRoleClient(event)
  let request = supabase
    .from('profiles')
    .select('id, email, full_name, wallet_balance', { count: 'exact' })
    .eq('role', 'member')
    .eq('status', 'active')
    .order('full_name', { ascending: true })
    .order('email', { ascending: true })
    .range(from, to)

  if (q) {
    const like = `%${escLike(q)}%`
    request = request.or(`full_name.ilike.${like},email.ilike.${like}`)
  }

  const { data, error, count } = await request

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const total = Number(count ?? 0)
  return {
    items: data ?? [],
    total,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
})
