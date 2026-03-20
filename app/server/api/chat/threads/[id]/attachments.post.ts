import { randomUUID } from 'node:crypto'
import { getProfileOrThrow } from '~/server/utils/auth'
import {
  assertThreadAccess,
  canMemberSendWhileUnassigned,
  getThreadOrThrow,
} from '~/server/utils/chat'
import { getServiceRoleClient } from '~/server/utils/supabase'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

function extensionByType(type: string) {
  if (type === 'image/png')
    return 'png'
  if (type === 'image/webp')
    return 'webp'
  return 'jpg'
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const threadId = getRouterParam(event, 'id')
  if (!threadId)
    throw createError({ statusCode: 400, message: 'Missing chat thread id.' })

  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename && part.data)
  if (!file || !file.filename || !file.data)
    throw createError({ statusCode: 400, message: 'Image file is required.' })

  const fileType = String(file.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(fileType))
    throw createError({ statusCode: 400, message: 'Only JPG, PNG, or WEBP is allowed.' })
  if (file.data.byteLength > MAX_BYTES)
    throw createError({ statusCode: 400, message: 'Image must be 5MB or smaller.' })

  const supabase = await getServiceRoleClient(event)
  const thread = await getThreadOrThrow(supabase, threadId)
  assertThreadAccess(profile, thread)
  if (thread.status === 'banned')
    throw createError({ statusCode: 400, message: 'Conversation is banned.' })

  if (profile.role === 'member' && !thread.assigned_to) {
    const { data: lastMessage, error: lastMessageErr } = await supabase
      .from('chat_messages')
      .select('sender_id')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastMessageErr)
      throw createError({ statusCode: 500, message: lastMessageErr.message })

    const canSend = canMemberSendWhileUnassigned(String(lastMessage?.sender_id ?? '') || null, profile.id)
    if (!canSend) {
      throw createError({
        statusCode: 403,
        message: 'Conversation is currently unassigned. Please wait for shop reply or assignment.',
      })
    }
  }

  const ext = extensionByType(fileType)
  const path = `chat/${threadId}/${profile.id}/${randomUUID()}.${ext}`

  const upload = await supabase.storage.from(BUCKET).upload(path, file.data, {
    contentType: fileType,
    upsert: false,
  })
  if (upload.error)
    throw createError({ statusCode: 500, message: upload.error.message })

  return {
    path,
    name: String(file.filename),
    mime_type: fileType,
    size_bytes: file.data.byteLength,
  }
})
