import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { canAssign, getThreadOrThrow } from '~/server/utils/chat'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  assigned_to: z.string().uuid().nullable(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  if (!canAssign(profile))
    throw createError({ statusCode: 403, message: 'Forbidden' })

  const threadId = getRouterParam(event, 'id')
  if (!threadId)
    throw createError({ statusCode: 400, message: 'Missing chat thread id.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  await getThreadOrThrow(supabase, threadId)

  const assignedTo = parsed.data.assigned_to
  if (assignedTo) {
    const { data: operator, error: operatorErr } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', assignedTo)
      .maybeSingle()
    if (operatorErr)
      throw createError({ statusCode: 500, message: operatorErr.message })
    if (!operator || operator.status !== 'active' || !['superadmin', 'admin', 'staff'].includes(String(operator.role)))
      throw createError({ statusCode: 400, message: 'Assigned user must be an active operator.' })
  }

  const { data, error } = await supabase
    .from('chat_threads')
    .update({
      assigned_to: assignedTo,
      assigned_by: assignedTo ? profile.id : null,
    })
    .eq('id', threadId)
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to assign thread.' })

  return { thread: data }
})
