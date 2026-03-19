import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getAdminDashboardAnalytics } from '~/server/services/dashboard/admin-analytics'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).default(30),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  return getAdminDashboardAnalytics(event, parsed.data.days)
})
