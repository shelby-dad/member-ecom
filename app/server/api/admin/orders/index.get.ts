import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { listAdminOrders } from '~/server/services/order-list/admin-orders'
import { getServiceRoleClient } from '~/server/utils/supabase'
import {
  normalizeAdminOrderSort,
  normalizePage,
  normalizePerPage,
  normalizeSortOrder,
} from '~/server/utils/order-query'

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const queryParams = getQuery(event)
  const q = String(queryParams.q ?? '').trim()
  const status = String(queryParams.status ?? '').trim()
  const createdFrom = String(queryParams.created_from ?? '').trim()
  const createdTo = String(queryParams.created_to ?? '').trim()
  const page = normalizePage(queryParams.page)
  const perPage = normalizePerPage(queryParams.per_page, [25, 50, 100], 25)
  const sortBy = normalizeAdminOrderSort(queryParams.sort_by)
  const sortOrder = normalizeSortOrder(queryParams.sort_order)

  const supabase = await getServiceRoleClient(event)
  return await listAdminOrders(supabase, {
    q,
    status,
    createdFrom,
    createdTo,
    page,
    perPage,
    sortBy,
    sortOrder,
  })
})
