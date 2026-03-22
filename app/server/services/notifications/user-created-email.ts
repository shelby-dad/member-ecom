import type { H3Event } from 'h3'
import nodemailer from 'nodemailer'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { renderEmailTemplateTokens, type EmailTemplateKey } from '~/server/utils/email-templates'
import { getAppSettings } from '~/server/utils/app-settings'

interface UserCreatedPayload {
  user_id: string
  email?: string | null
  created_at?: string | null
}

interface TemplateRow {
  template_key: EmailTemplateKey
  subject: string
  body_html: string
  is_active: boolean
}

type SendResult =
  | { status: 'sent'; recipients: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

function formatJoinedAt(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime()))
    return '-'
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${month} ${day} ${year}`
}

function storagePublicUrl(baseUrl: string, path: string | null | undefined) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${value}`
}

function wrapEmailHtml(contentHtml: string, data: {
  siteName: string
  siteLogoUrl: string
  shopEmail: string
  shopMobile: string
  shopAddress: string
}) {
  const logoBlock = data.siteLogoUrl
    ? `<img src="${data.siteLogoUrl}" alt="${data.siteName}" style="max-height:64px;width:auto;display:block;" />`
    : `<div style="font-size:20px;font-weight:700;color:#0f172a;">${data.siteName}</div>`

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${data.siteName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;border-bottom:1px solid #e2e8f0;text-align:center;">
                ${logoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:20px;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:13px;line-height:1.5;color:#475569;">
                <div><strong>Email:</strong> ${data.shopEmail || '-'}</div>
                <div><strong>Mobile:</strong> ${data.shopMobile || '-'}</div>
                <div><strong>Address:</strong> ${data.shopAddress || '-'}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function toPlainText(html: string) {
  return String(html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveAppBaseUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  const fromPublicRuntime = String(config.public?.appUrl ?? '').trim()
  if (fromPublicRuntime)
    return fromPublicRuntime
  const fromNuxtPublicEnv = String(process.env.NUXT_PUBLIC_APP_URL ?? '').trim()
  if (fromNuxtPublicEnv)
    return fromNuxtPublicEnv
  const fromServerEnv = String(process.env.APP_BASE_URL ?? '').trim()
  if (fromServerEnv)
    return fromServerEnv
  return ''
}

export async function sendUserCreatedNotificationEmail(event: H3Event, payload: UserCreatedPayload): Promise<SendResult> {
  const userId = String(payload?.user_id ?? '').trim()
  if (!userId)
    return { status: 'failed', error: 'Missing user_id' }

  const supabase = await getServiceRoleClient(event)
  const { data: templateRows, error: templateError } = await supabase
    .from('email_templates')
    .select('template_key, subject, body_html, is_active')
    .in('template_key', ['user_add_notification', 'welcome_member_notification'])

  if (templateError)
    return { status: 'failed', error: `template_load_failed: ${templateError.message}` }

  const templates = new Map<EmailTemplateKey, TemplateRow>()
  for (const row of (templateRows ?? [])) {
    const key = String((row as any)?.template_key ?? '') as EmailTemplateKey
    if (key !== 'user_add_notification' && key !== 'welcome_member_notification')
      continue
    templates.set(key, {
      template_key: key,
      subject: String((row as any)?.subject ?? ''),
      body_html: String((row as any)?.body_html ?? ''),
      is_active: Boolean((row as any)?.is_active),
    })
  }

  const settings = await getAppSettings(event)
  const smtpHost = String(settings.smtp_host ?? '').trim()
  const smtpPort = Number(settings.smtp_port ?? 0)
  const smtpUser = String(settings.smtp_user ?? '').trim()
  const smtpPassword = String(settings.smtp_password ?? '').trim()
  const smtpFromEmail = String(settings.smtp_from_email ?? '').trim()
  const smtpFromName = String(settings.smtp_from_name ?? '').trim() || 'Tenant Shop'
  const smtpSecure = Boolean(settings.smtp_secure)
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail)
    return { status: 'skipped', reason: 'smtp_not_configured' }

  const { data: recipientRows, error: recipientError } = await supabase
    .from('profiles')
    .select('email')
    .in('role', ['superadmin', 'admin'])
    .eq('status', 'active')
    .not('email', 'is', null)
  if (recipientError)
    return { status: 'failed', error: `recipients_load_failed: ${recipientError.message}` }

  const recipients = [...new Set((recipientRows ?? []).map(row => String(row.email ?? '').trim()).filter(Boolean))]

  const { data: userProfile, error: userProfileError } = await supabase
    .from('profiles')
    .select('full_name, mobile_number, email')
    .eq('id', userId)
    .maybeSingle()
  if (userProfileError)
    return { status: 'failed', error: `user_profile_load_failed: ${userProfileError.message}` }

  const userFullName = String(userProfile?.full_name ?? '').trim() || '-'
  const userPhone = String(userProfile?.mobile_number ?? '').trim() || '-'
  const userEmail = String(userProfile?.email ?? payload.email ?? '').trim() || '-'

  const config = useRuntimeConfig(event)
  const appUrl = resolveAppBaseUrl(event)
  const dashboardUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/users` : ''
  const joinedAt = formatJoinedAt(payload.created_at)

  const variables = {
    site_name: String(settings.site_name ?? '').trim() || 'Tenant Shop',
    user_full_name: userFullName,
    user_phone: userPhone,
    user_email: userEmail,
    joined_at: joinedAt,
    dashboard_url: dashboardUrl,
  }

  const timeoutMs = Math.max(3000, Number(process.env.SMTP_TIMEOUT_MS ?? '10000') || 10000)
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    connectionTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
  })

  async function sendTemplateEmail(templateKey: EmailTemplateKey) {
    const template = templates.get(templateKey)
    if (!template)
      return { sent: false, skipped: true, reason: 'template_missing', recipients: 0 }
    if (!template.is_active)
      return { sent: false, skipped: true, reason: 'template_inactive', recipients: 0 }

    const renderedBody = renderEmailTemplateTokens(template.body_html, variables)
    const wrappedHtml = wrapEmailHtml(renderedBody, {
      siteName: variables.site_name,
      siteLogoUrl: storagePublicUrl(String(config.public.supabaseUrl ?? ''), settings.shop_logo),
      shopEmail: String(settings.shop_email ?? '').trim() || smtpFromEmail || '-',
      shopMobile: String(settings.mobile_number ?? '').trim() || '-',
      shopAddress: String(settings.shop_address ?? '').trim() || '-',
    })
    const subject = renderEmailTemplateTokens(template.subject, variables)
    const text = toPlainText(`${renderedBody}\nEmail: ${settings.shop_email ?? '-'}\nMobile: ${settings.mobile_number ?? '-'}\nAddress: ${settings.shop_address ?? '-'}`)

    if (templateKey === 'user_add_notification') {
      if (!recipients.length)
        return { sent: false, skipped: true, reason: 'no_admin_recipients', recipients: 0 }
      await transport.sendMail({
        from: smtpFromName ? `${smtpFromName} <${smtpFromEmail}>` : smtpFromEmail,
        to: smtpFromEmail,
        bcc: recipients,
        subject,
        html: wrappedHtml,
        text,
      })
      return { sent: true, skipped: false, reason: '', recipients: recipients.length }
    }

    const toEmail = userEmail === '-' ? '' : userEmail
    if (!toEmail)
      return { sent: false, skipped: true, reason: 'no_member_email', recipients: 0 }

    await transport.sendMail({
      from: smtpFromName ? `${smtpFromName} <${smtpFromEmail}>` : smtpFromEmail,
      to: toEmail,
      subject,
      html: wrappedHtml,
      text,
    })
    return { sent: true, skipped: false, reason: '', recipients: 1 }
  }

  try {
    const adminSend = await sendTemplateEmail('user_add_notification')
    const memberSend = await sendTemplateEmail('welcome_member_notification')
    const sentCount = adminSend.recipients + memberSend.recipients

    if (sentCount > 0)
      return { status: 'sent', recipients: sentCount }

    const reason = [adminSend.reason, memberSend.reason].filter(Boolean).join(', ') || 'nothing_to_send'
    return { status: 'skipped', reason }
  } catch (error: any) {
    return { status: 'failed', error: `smtp_send_failed: ${String(error?.message ?? error ?? 'unknown')}` }
  }
}
