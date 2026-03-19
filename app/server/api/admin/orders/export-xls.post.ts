import { z } from 'zod'
import * as XLSX from 'xlsx'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { mapOrdersToExportRows } from '~/server/utils/order-export'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const orderIds = [...new Set(parsed.data.order_ids)]
  const supabase = await getServiceRoleClient(event)

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, user_id, status, total, payment_status, discount_total, created_at, updated_at, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country')
    .in('id', orderIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (ordersError)
    throw createError({ statusCode: 500, message: ordersError.message })

  const list = orders ?? []
  const userIds = [...new Set(list.map((o: any) => o.user_id).filter(Boolean))]
  let profileMap: Record<string, { full_name: string | null, email: string | null }> = {}

  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    if (profilesError)
      throw createError({ statusCode: 500, message: profilesError.message })
    profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]))
  }

  const rows = mapOrdersToExportRows(list, profileMap)

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders')
  const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' })

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  setHeader(event, 'Content-Type', 'application/vnd.ms-excel')
  setHeader(event, 'Content-Disposition', `attachment; filename="orders-${stamp}.xls"`)
  return file
})
