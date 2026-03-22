import type { H3Event } from 'h3'
import nodemailer from 'nodemailer'
import { getAppSettings } from '~/server/utils/app-settings'
import { renderEmailTemplateTokens, renderEmailTemplateWithLineItems } from '~/server/utils/email-templates'
import { getServiceRoleClient } from '~/server/utils/supabase'

interface MemberPurchasePayload {
  order_id: string
}

interface TemplateRow {
  subject: string
  body_html: string
  is_active: boolean
}

type SendResult =
  | { status: 'sent'; recipients: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

function formatDateShort(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime()))
    return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

function formatPriceBySettings(value: number, settings: {
  pricing_sign: string | null
  pricing_symbol: string | null
  pricing_decimals: number | null
  pricing_symbol_position: 'before' | 'after' | null
}) {
  const amount = Number(value || 0)
  const decimals = Math.max(0, Math.min(4, Number(settings.pricing_decimals ?? 0) || 0))
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount))
  const symbol = String(settings.pricing_symbol ?? '').trim() || '฿'
  const positioned = settings.pricing_symbol_position === 'after'
    ? `${number}${symbol}`
    : `${symbol}${number}`
  const signed = `${String(settings.pricing_sign ?? '').trim()}${positioned}`
  return amount < 0 ? `-${signed}` : signed
}

function toPlainText(html: string) {
  return String(html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

export async function sendMemberPurchaseNotificationEmail(event: H3Event, payload: MemberPurchasePayload): Promise<SendResult> {
  const orderId = String(payload?.order_id ?? '').trim()
  if (!orderId)
    return { status: 'failed', error: 'Missing order_id' }

  const supabase = await getServiceRoleClient(event)
  const { data: templateData, error: templateError } = await supabase
    .from('email_templates')
    .select('subject, body_html, is_active')
    .eq('template_key', 'member_purchase')
    .maybeSingle()

  if (templateError)
    return { status: 'failed', error: `template_load_failed: ${templateError.message}` }
  if (!templateData)
    return { status: 'skipped', reason: 'template_missing' }

  const template: TemplateRow = {
    subject: String((templateData as any).subject ?? ''),
    body_html: String((templateData as any).body_html ?? ''),
    is_active: Boolean((templateData as any).is_active),
  }
  if (!template.is_active)
    return { status: 'skipped', reason: 'template_inactive' }

  const [{ data: order, error: orderError }, { data: orderItems, error: orderItemsError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, source, created_at, payment_method_type, discount_total, total, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, user_id')
      .eq('id', orderId)
      .maybeSingle(),
    supabase
      .from('order_items')
      .select('product_name, quantity, total')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
  ])
  if (orderError)
    return { status: 'failed', error: `order_load_failed: ${orderError.message}` }
  if (!order)
    return { status: 'skipped', reason: 'order_missing' }
  if (String(order.source ?? '') !== 'Member Order')
    return { status: 'skipped', reason: 'source_not_member_order' }
  if (orderItemsError)
    return { status: 'failed', error: `order_items_load_failed: ${orderItemsError.message}` }

  const [{ data: userProfile, error: userProfileError }, { data: paymentSubmission, error: paymentSubmissionError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, mobile_number')
      .eq('id', String(order.user_id))
      .maybeSingle(),
    supabase
      .from('payment_submissions')
      .select('payment_method_id, payment_methods(name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (userProfileError)
    return { status: 'failed', error: `profile_load_failed: ${userProfileError.message}` }
  if (paymentSubmissionError)
    return { status: 'failed', error: `payment_submission_load_failed: ${paymentSubmissionError.message}` }

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
    .in('role', ['superadmin', 'admin', 'staff'])
    .eq('status', 'active')
    .not('email', 'is', null)
  if (recipientError)
    return { status: 'failed', error: `recipients_load_failed: ${recipientError.message}` }

  const recipients = new Set((recipientRows ?? []).map((row: any) => String(row?.email ?? '').trim()).filter(Boolean))
  const memberEmail = String(userProfile?.email ?? '').trim()
  if (memberEmail)
    recipients.add(memberEmail)

  if (!recipients.size)
    return { status: 'skipped', reason: 'no_recipients' }

  const paymentMethodRelation = (paymentSubmission as any)?.payment_methods
  const paymentMethod = String(
    Array.isArray(paymentMethodRelation)
      ? paymentMethodRelation[0]?.name
      : paymentMethodRelation?.name ?? 'Bank Transfer',
  ).trim() || 'Bank Transfer'
  const noteParts = [
    String(order.shipping_name ?? '').trim(),
    String(order.shipping_line1 ?? '').trim(),
    String(order.shipping_line2 ?? '').trim(),
    String(order.shipping_city ?? '').trim(),
    String(order.shipping_state ?? '').trim(),
    String(order.shipping_postal_code ?? '').trim(),
    String(order.shipping_country ?? '').trim(),
  ].filter(Boolean)

  const variables = {
    site_name: String(settings.site_name ?? '').trim() || 'Tenant Shop',
    user_full_name: String(userProfile?.full_name ?? '').trim() || '-',
    user_email: memberEmail || '-',
    user_phone: String(userProfile?.mobile_number ?? '').trim() || '-',
    order_number: String(order.order_number ?? '').trim() || '-',
    order_date: formatDateShort(String(order.created_at ?? '')),
    payment_method: paymentMethod,
    discount_amount: Number(order.discount_total ?? 0) > 0 ? formatPriceBySettings(Number(order.discount_total ?? 0), settings) : '-',
    total_amount: formatPriceBySettings(Number(order.total ?? 0), settings),
    note_information: noteParts.join(', ') || '-',
  }

  const lineItems = ((orderItems ?? []) as any[]).map(item => ({
    line_of_item_name: String(item.product_name ?? '').trim() || '-',
    line_of_item_qty: String(Number(item.quantity ?? 0) || 0),
    line_of_total: formatPriceBySettings(Number(item.total ?? 0), settings),
  }))

  const renderedBody = renderEmailTemplateWithLineItems(template.body_html, variables, lineItems)
  const wrappedHtml = wrapEmailHtml(renderedBody, {
    siteName: variables.site_name,
    siteLogoUrl: storagePublicUrl(String(useRuntimeConfig(event).public.supabaseUrl ?? ''), settings.shop_logo),
    shopEmail: String(settings.shop_email ?? '').trim() || smtpFromEmail || '-',
    shopMobile: String(settings.mobile_number ?? '').trim() || '-',
    shopAddress: String(settings.shop_address ?? '').trim() || '-',
  })
  const subject = renderEmailTemplateTokens(template.subject, variables)
  const text = toPlainText(
    `${renderedBody}\nEmail: ${settings.shop_email ?? '-'}\nMobile: ${settings.mobile_number ?? '-'}\nAddress: ${settings.shop_address ?? '-'}`,
  )

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

  try {
    await transport.sendMail({
      from: smtpFromName ? `${smtpFromName} <${smtpFromEmail}>` : smtpFromEmail,
      to: smtpFromEmail,
      bcc: [...recipients],
      subject,
      html: wrappedHtml,
      text,
    })
    return { status: 'sent', recipients: recipients.size }
  } catch (error: any) {
    return { status: 'failed', error: `smtp_send_failed: ${String(error?.message ?? error ?? 'unknown')}` }
  }
}
