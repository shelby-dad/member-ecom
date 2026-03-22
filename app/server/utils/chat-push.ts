import type { H3Event } from 'h3'
import webpush from 'web-push'
import { getServiceRoleClient } from '~/server/utils/supabase'

export interface ChatPushRecipient {
  id: string
  role: 'member' | 'staff' | 'admin' | 'superadmin'
}

export interface PushRecipient {
  id: string
  role: 'member' | 'staff' | 'admin' | 'superadmin'
}

let vapidConfigured = false

function resolveInboxPath(role: ChatPushRecipient['role'], threadId?: string | null) {
  const normalizedThreadId = String(threadId ?? '').trim()
  if (role === 'member')
    return '/member/chat'
  if (role === 'staff')
    return normalizedThreadId ? `/staff/inbox/${normalizedThreadId}` : '/staff/inbox'
  if (role === 'superadmin')
    return normalizedThreadId ? `/superadmin/inbox/${normalizedThreadId}` : '/superadmin/inbox'
  return normalizedThreadId ? `/admin/inbox/${normalizedThreadId}` : '/admin/inbox'
}

function configureVapidIfNeeded(event: H3Event) {
  if (vapidConfigured)
    return true

  const config = useRuntimeConfig(event)
  const publicKey = String(config.public.vapidPublicKey ?? '').trim()
  const privateKey = String(config.vapidPrivateKey ?? '').trim()
  const subject = String(config.vapidSubject ?? '').trim()

  if (!publicKey || !privateKey || !subject)
    return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export async function sendChatPushToRecipients(
  event: H3Event,
  input: {
    recipients: ChatPushRecipient[]
    title: string
    body: string
    sentAt?: string
    threadId?: string
  },
) {
  if (!configureVapidIfNeeded(event))
    return

  const recipientIds = [...new Set(input.recipients.map(item => String(item.id)).filter(Boolean))]
  if (!recipientIds.length)
    return

  const roleByUser = new Map<string, ChatPushRecipient['role']>()
  for (const recipient of input.recipients)
    roleByUser.set(String(recipient.id), recipient.role)

  const supabase = await getServiceRoleClient(event)
  const { data: subscriptions, error } = await supabase
    .from('chat_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .in('user_id', recipientIds)

  if (error || !subscriptions?.length)
    return

  for (const subscription of subscriptions) {
    const recipientId = String((subscription as any).user_id)
    const recipientRole = roleByUser.get(recipientId)
    if (!recipientRole)
      continue

    const payload = JSON.stringify({
      title: input.title,
      sender_name: input.title,
      body: input.body,
      url: resolveInboxPath(recipientRole, input.threadId),
      ts: Date.now(),
      sent_at: input.sentAt ?? null,
    })

    try {
      await webpush.sendNotification({
        endpoint: String((subscription as any).endpoint),
        keys: {
          p256dh: String((subscription as any).p256dh),
          auth: String((subscription as any).auth),
        },
      }, payload)
    }
    catch (err: any) {
      const statusCode = Number(err?.statusCode ?? 0)
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from('chat_push_subscriptions')
          .delete()
          .eq('id', String((subscription as any).id))
      }
    }
  }
}

export async function sendPushToRecipients(
  event: H3Event,
  input: {
    recipients: PushRecipient[]
    title: string
    body: string
    sentAt?: string
    url?: string | null
    urlByUserId?: Record<string, string>
    tag?: string
  },
) {
  if (!configureVapidIfNeeded(event))
    return

  const recipientIds = [...new Set(input.recipients.map(item => String(item.id)).filter(Boolean))]
  if (!recipientIds.length)
    return

  const supabase = await getServiceRoleClient(event)
  const { data: subscriptions, error } = await supabase
    .from('chat_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .in('user_id', recipientIds)

  if (error || !subscriptions?.length)
    return

  for (const subscription of subscriptions) {
    const recipientId = String((subscription as any).user_id)
    const targetUrl = String(input.urlByUserId?.[recipientId] ?? input.url ?? '').trim()
    const payload = JSON.stringify({
      title: input.title,
      sender_name: input.title,
      body: input.body,
      url: targetUrl || '/admin',
      tag: String(input.tag ?? '').trim() || null,
      ts: Date.now(),
      sent_at: input.sentAt ?? null,
    })

    try {
      await webpush.sendNotification({
        endpoint: String((subscription as any).endpoint),
        keys: {
          p256dh: String((subscription as any).p256dh),
          auth: String((subscription as any).auth),
        },
      }, payload)
    }
    catch (err: any) {
      const statusCode = Number(err?.statusCode ?? 0)
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from('chat_push_subscriptions')
          .delete()
          .eq('id', String((subscription as any).id))
      }
    }
  }
}
