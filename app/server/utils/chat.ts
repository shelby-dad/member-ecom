import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole } from '~/server/utils/auth'

export interface ChatActor {
  id: string
  role: AppRole
}

export interface ChatThreadRow {
  id: string
  member_id: string
  assigned_to: string | null
  assigned_by: string | null
  status: 'open' | 'banned'
  banned_by: string | null
  banned_at: string | null
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export function canAssign(actor: ChatActor) {
  return actor.role === 'admin' || actor.role === 'superadmin'
}

export function isOperator(actor: ChatActor) {
  return actor.role === 'superadmin' || actor.role === 'admin' || actor.role === 'staff'
}

export function assertThreadAccess(actor: ChatActor, thread: ChatThreadRow) {
  if (actor.role === 'member' && thread.member_id !== actor.id)
    throw createError({ statusCode: 403, message: 'Forbidden' })
  if (actor.role === 'staff' && thread.assigned_to !== actor.id)
    throw createError({ statusCode: 403, message: 'Forbidden' })
}

export async function getThreadOrThrow(
  supabase: SupabaseClient,
  threadId: string,
): Promise<ChatThreadRow> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at')
    .eq('id', threadId)
    .maybeSingle()
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (!data)
    throw createError({ statusCode: 404, message: 'Chat thread not found.' })
  return data as ChatThreadRow
}

export function normalizeMessagePreview(message: string) {
  return message.trim().slice(0, 160)
}

export function canMemberSendWhileUnassigned(lastSenderId: string | null, memberId: string) {
  if (!lastSenderId)
    return true
  return String(lastSenderId) !== String(memberId)
}

export function normalizeChatAttachmentMessage(message: string, hasAttachment: boolean) {
  const text = String(message ?? '').trim()
  if (text)
    return text
  if (hasAttachment)
    return 'sent a file'
  return ''
}

export function normalizeMessagePreviewWithAttachment(message: string, hasAttachment: boolean) {
  const normalized = normalizeChatAttachmentMessage(message, hasAttachment)
  return normalized.slice(0, 160)
}

export function truncateNotificationMessage(message: string, max = 100) {
  const text = String(message ?? '').trim()
  if (text.length <= max)
    return text
  return `${text.slice(0, max)}...`
}

export function buildChatNotificationBody(message: string, hasAttachment: boolean) {
  const text = String(message ?? '').trim()
  const normalized = truncateNotificationMessage(text, 100)
  if (!hasAttachment)
    return normalized

  if (normalized && normalized !== 'sent a file')
    return `${normalized} (received image)`

  return 'received image'
}

export function isValidImageAttachmentPath(path: string) {
  const value = String(path ?? '').trim()
  if (!value || value.length > 500)
    return false
  if (value.includes('..') || value.startsWith('/'))
    return false
  return /\.(png|jpe?g|webp)$/i.test(value)
}
