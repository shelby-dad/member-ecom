import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const CHUNK_SIZE = 200

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size))
  return out
}

async function deleteByIds({
  supabase,
  table,
  column,
  ids,
}: {
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>
  table: string
  column: string
  ids: string[]
}) {
  if (!ids.length)
    return 0

  let total = 0
  for (const idsChunk of chunk(ids, CHUNK_SIZE)) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in(column, idsChunk)
    if (error)
      throw createError({ statusCode: 500, message: `[${table}] ${error.message}` })
    total += count ?? 0
  }
  return total
}

async function deleteOrdersAndChildren(supabase: Awaited<ReturnType<typeof getServiceRoleClient>>, userId: string) {
  const { data: orderRows, error: orderRowsError } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
  if (orderRowsError)
    throw createError({ statusCode: 500, message: orderRowsError.message })

  const orderIds = (orderRows ?? []).map(row => String(row.id)).filter(Boolean)
  if (orderIds.length) {
    await deleteByIds({ supabase, table: 'payment_submissions', column: 'order_id', ids: orderIds })
    await deleteByIds({ supabase, table: 'order_status_history', column: 'order_id', ids: orderIds })
    await deleteByIds({ supabase, table: 'order_items', column: 'order_id', ids: orderIds })
  }

  await deleteByIds({ supabase, table: 'orders', column: 'user_id', ids: [userId] })
}

export default defineEventHandler(async (event) => {
  const actor = await getProfileOrThrow(event)
  requireRoles(actor, ['superadmin'])

  const userId = getRouterParam(event, 'id')
  if (!userId)
    throw createError({ statusCode: 400, message: 'Missing user id' })
  if (userId === actor.id)
    throw createError({ statusCode: 400, message: 'You cannot delete your own account.' })

  const supabase = await getServiceRoleClient(event)

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle()
  if (targetError)
    throw createError({ statusCode: 500, message: targetError.message })
  if (!target)
    throw createError({ statusCode: 404, message: 'User not found' })

  await deleteOrdersAndChildren(supabase, userId)
  await deleteByIds({ supabase, table: 'payment_submissions', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'reviews', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'addresses', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'member_cart_items', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'chat_push_subscriptions', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'chat_presence', column: 'user_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'chat_threads', column: 'member_id', ids: [userId] })
  await deleteByIds({ supabase, table: 'profiles', column: 'id', ids: [userId] })

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)
  if (authDeleteError)
    throw createError({ statusCode: 500, message: authDeleteError.message })

  return {
    ok: true,
    id: userId,
    email: target.email,
    role: target.role,
  }
})
