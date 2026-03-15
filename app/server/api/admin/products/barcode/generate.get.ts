import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { generateUniqueProductBarcode } from '~/server/utils/barcode'

const querySchema = z.object({
  type: z.enum(['code128', 'ean13', 'upca']).optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { barcode, type } = await generateUniqueProductBarcode(event, supabase, parsed.data.type)
  return { barcode, type }
})
