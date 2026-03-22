import type { H3Event } from 'h3'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { sendPushToRecipients, type PushRecipient } from '~/server/utils/chat-push'

export type NotificationKind =
  | 'member_order_created'
  | 'chat_unassigned_member_started'
  | 'order_status_changed'
  | 'order_payment_verified'

export interface UserNotificationInput {
  user_id: string
  actor_id?: string | null
  kind: NotificationKind | string
  title: string
  message: string
  target_url?: string | null
  payload?: Record<string, any> | null
}

export async function createUserNotifications(
  event: H3Event,
  input: UserNotificationInput[],
) {
  const rows = input
    .map(item => ({
      user_id: String(item.user_id ?? '').trim(),
      actor_id: String(item.actor_id ?? '').trim() || null,
      kind: String(item.kind ?? '').trim(),
      title: String(item.title ?? '').trim(),
      message: String(item.message ?? '').trim(),
      target_url: String(item.target_url ?? '').trim() || null,
      payload: item.payload ?? {},
    }))
    .filter(item => item.user_id && item.kind && item.title && item.message)

  if (!rows.length)
    return []

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('user_notifications')
    .insert(rows)
    .select('id, user_id, kind, title, message, target_url, is_read, read_at, created_at')

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data ?? []
}

export async function notifyUser(
  event: H3Event,
  input: UserNotificationInput & {
    recipient_role?: PushRecipient['role'] | null
    send_push?: boolean
    push_title?: string
    push_body?: string
    push_tag?: string
  },
) {
  const created = await createUserNotifications(event, [input])
  if (input.send_push && input.recipient_role) {
    await sendPushToRecipients(event, {
      recipients: [{
        id: String(input.user_id),
        role: input.recipient_role,
      }],
      title: String(input.push_title ?? input.title),
      body: String(input.push_body ?? input.message),
      url: String(input.target_url ?? '').trim() || null,
      tag: input.push_tag ?? 'shop-notification',
      sentAt: new Date().toISOString(),
    })
  }
  return created[0] ?? null
}

export async function notifyRoles(
  event: H3Event,
  input: {
    roles: Array<'superadmin' | 'admin' | 'staff'>
    actor_id?: string | null
    kind: NotificationKind | string
    title: string
    message: string
    target_url?: string | null
    target_url_by_role?: Partial<Record<'superadmin' | 'admin' | 'staff' | 'member', string>>
    payload?: Record<string, any> | null
    send_push?: boolean
    push_title?: string
    push_body?: string
    push_tag?: string
  },
) {
  const roles = [...new Set(input.roles)]
  if (!roles.length)
    return { users: [], notifications: [] as any[] }

  const supabase = await getServiceRoleClient(event)
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, status')
    .in('role', roles)
    .eq('status', 'active')

  if (profileError)
    throw createError({ statusCode: 500, message: profileError.message })

  const users = (profileRows ?? [])
    .map(row => ({
      id: String((row as any).id ?? '').trim(),
      role: String((row as any).role ?? '').trim() as PushRecipient['role'],
    }))
    .filter(row => row.id && (row.role === 'superadmin' || row.role === 'admin' || row.role === 'staff'))

  if (!users.length)
    return { users: [], notifications: [] as any[] }

  const urlByUserId: Record<string, string> = {}
  const notificationRows: UserNotificationInput[] = users.map((user) => {
    const targetUrl = String(
      input.target_url_by_role?.[user.role]
      ?? input.target_url
      ?? '',
    ).trim()
    if (targetUrl)
      urlByUserId[user.id] = targetUrl
    return {
      user_id: user.id,
      actor_id: input.actor_id ?? null,
      kind: input.kind,
      title: input.title,
      message: input.message,
      target_url: targetUrl || null,
      payload: input.payload ?? {},
    }
  })
  const notifications = await createUserNotifications(event, notificationRows)

  if (input.send_push) {
    await sendPushToRecipients(event, {
      recipients: users,
      title: String(input.push_title ?? input.title),
      body: String(input.push_body ?? input.message),
      url: input.target_url ?? null,
      urlByUserId,
      tag: input.push_tag ?? 'shop-notification',
      sentAt: new Date().toISOString(),
    })
  }

  return { users, notifications }
}
