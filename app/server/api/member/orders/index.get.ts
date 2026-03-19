import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { listMemberOrders } from '~/server/services/order-list/member-orders'
import { getServiceRoleClient } from '~/server/utils/supabase'
import {
  normalizeMemberOrderSort,
  normalizePage,
  normalizePerPage,
  normalizeSortOrder,
  toEndOfDayIso,
  toStartOfDayIso,
} from '~/server/utils/order-query'

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const queryParams = getQuery(event)
  const q = String(queryParams.q ?? '').trim()
  const status = String(queryParams.status ?? '').trim()
  const dateFrom = String(queryParams.date_from ?? '').trim()
  const dateTo = String(queryParams.date_to ?? '').trim()
  const page = normalizePage(queryParams.page)
  const perPage = normalizePerPage(queryParams.per_page, [10, 25, 50, 100], 25)
  const sortBy = normalizeMemberOrderSort(queryParams.sort_by)
  const sortOrder = normalizeSortOrder(queryParams.sort_order)

  const supabase = await getServiceRoleClient(event)
  const fromIso = dateFrom ? toStartOfDayIso(dateFrom) : null
  const toIso = dateTo ? toEndOfDayIso(dateTo) : null

  return await listMemberOrders(supabase, {
    userId: profile.id,
    q,
    status,
    fromIso,
    toIso,
    page,
    perPage,
    sortBy,
    sortOrder,
  })
})
