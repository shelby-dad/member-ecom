/// <reference path="../types.d.ts" />
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import nodemailer from 'npm:nodemailer@6.9.16'
import { logger } from '../_shared/logger.ts'
import { optionalEnv, requireEnv } from '../_shared/env.ts'
import { decryptSecretParts } from '../_shared/secret-crypto.ts'

interface UserCreatedPayload {
  user_id: string
  email: string | null
  created_at?: string | null
}

const FUNCTION_NAME = 'user-created-notify'

function elapsedMs(startedAt: number) {
  return Math.max(0, Date.now() - startedAt)
}

function logEvent(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  requestId: string,
  startedAt: number,
  data: Record<string, unknown> = {},
) {
  logger.event(level, event, { requestId, functionName: FUNCTION_NAME }, {
    elapsedMs: elapsedMs(startedAt),
    ...data,
  })
}

function maskEmail(value: string | null | undefined) {
  const email = String(value ?? '').trim()
  if (!email)
    return ''
  const [local, domain] = email.split('@')
  if (!local || !domain)
    return '[invalid-email]'
  const localMasked = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local[0]}***${local.slice(-1)}`
  const domainMasked = domain.replace(/^[^.]+/, '***')
  return `${localMasked}@${domainMasked}`
}

function maskHost(value: string | null | undefined) {
  const host = String(value ?? '').trim()
  if (!host)
    return ''
  if (host.length <= 6)
    return '***'
  return `${host.slice(0, 2)}***${host.slice(-2)}`
}

function maskIdentifier(value: string | null | undefined) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return ''
  if (raw.length <= 4)
    return `${raw[0] ?? '*'}***`
  return `${raw.slice(0, 2)}***${raw.slice(-2)}`
}

function normalizeCryptoKey(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return ''
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith('\'') && raw.endsWith('\'')))
    return raw.slice(1, -1).trim()
  return raw
}

async function keyFingerprint(value: string) {
  const normalized = normalizeCryptoKey(value)
  if (!normalized)
    return 'none'
  const bytes = new TextEncoder().encode(normalized)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const hex = Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 12)
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isAuthorized(req: Request) {
  const expectedToken = requireEnv('INTERNAL_EDGE_TRIGGER_TOKEN')
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const bearer = raw.replace(/^Bearer\s+/i, '').trim()
  return bearer && bearer === expectedToken
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  try {
    logEvent('info', 'request.received', requestId, startedAt, {
      method: req.method,
    })

    if (req.method !== 'POST')
      return json(405, { error: 'Method not allowed' })

    if (!isAuthorized(req)) {
      logEvent('warn', 'request.unauthorized', requestId, startedAt)
      return json(401, { error: 'Unauthorized' })
    }

    const payload = (await req.json()) as UserCreatedPayload
    const userId = String(payload?.user_id ?? '').trim()
    const userEmail = String(payload?.email ?? '').trim() || null
    logEvent('info', 'request.payload_parsed', requestId, startedAt, {
      userId: maskIdentifier(userId),
      userEmail: maskEmail(userEmail),
      hasCreatedAt: Boolean(payload?.created_at),
    })

    if (!userId) {
      logEvent('warn', 'request.payload_invalid', requestId, startedAt, {
        reason: 'missing_user_id',
      })
      return json(400, { error: 'Missing user_id' })
    }

    const supabaseUrl = requireEnv('SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const cryptoKey = normalizeCryptoKey(requireEnv('CRYPTO_KEY'))
    const cryptoKeyFp = await keyFingerprint(cryptoKey)
    const appBaseUrl = optionalEnv('APP_BASE_URL', '')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: appSettings, error: settingsErr } = await supabase
      .from('app_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_password_iv, smtp_password_content, smtp_from_email, smtp_from_name, smtp_secure, site_name')
      .eq('id', true)
      .maybeSingle()

    if (settingsErr) {
      logEvent('error', 'settings.load_failed', requestId, startedAt, {
        error: settingsErr.message,
      })
      return json(500, { error: 'Failed to load settings' })
    }

    const smtpHost = String((appSettings as any)?.smtp_host ?? '').trim()
    const smtpPort = Number((appSettings as any)?.smtp_port ?? 0)
    const smtpUser = String((appSettings as any)?.smtp_user ?? '').trim()
    const smtpPasswordIv = String((appSettings as any)?.smtp_password_iv ?? '').trim()
    const smtpPasswordContent = String((appSettings as any)?.smtp_password_content ?? '').trim()
    const smtpFromEmail = String((appSettings as any)?.smtp_from_email ?? '').trim()
    const smtpFromName = String((appSettings as any)?.smtp_from_name ?? '').trim() || 'Tenant Shop'
    const smtpSecure = Boolean((appSettings as any)?.smtp_secure)
    const siteName = String((appSettings as any)?.site_name ?? '').trim() || 'Tenant Shop'
    logEvent('info', 'smtp.config_loaded', requestId, startedAt, {
      hasHost: Boolean(smtpHost),
      host: maskHost(smtpHost),
      port: smtpPort || null,
      secure: smtpSecure,
      user: maskIdentifier(smtpUser),
      fromEmail: maskEmail(smtpFromEmail),
      hasEncryptedPassword: Boolean(smtpPasswordIv && smtpPasswordContent),
      ivLength: smtpPasswordIv.length || 0,
      contentLength: smtpPasswordContent.length || 0,
      keyFingerprint: cryptoKeyFp,
    })

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPasswordIv || !smtpPasswordContent || !smtpFromEmail) {
      logEvent('warn', 'smtp.config_incomplete', requestId, startedAt)
      return json(202, { ok: true, skipped: true, reason: 'smtp_not_configured' })
    }

    let smtpPassword = ''
    try {
      smtpPassword = await decryptSecretParts(smtpPasswordIv, smtpPasswordContent, cryptoKey)
    } catch (decryptError: any) {
      logEvent('warn', 'smtp.password_decrypt_failed', requestId, startedAt, {
        error: String(decryptError?.message ?? decryptError ?? 'decrypt_error'),
        keyFingerprint: cryptoKeyFp,
      })
      return json(202, { ok: true, skipped: true, reason: 'smtp_decrypt_failed' })
    }
    logEvent('info', 'smtp.password_decrypted', requestId, startedAt, {
      hasPasswordAfterDecrypt: Boolean(smtpPassword),
    })
    if (!smtpPassword) {
      logEvent('warn', 'smtp.password_empty_after_decrypt', requestId, startedAt)
      return json(202, { ok: true, skipped: true, reason: 'smtp_invalid' })
    }

    const { data: recipients, error: recipientsErr } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .in('role', ['superadmin', 'admin'])
      .eq('status', 'active')
      .not('email', 'is', null)

    if (recipientsErr) {
      logEvent('error', 'recipients.load_failed', requestId, startedAt, {
        error: recipientsErr.message,
      })
      return json(500, { error: 'Failed to load recipients' })
    }

    const emails = [...new Set((recipients ?? []).map((item: any) => String(item.email ?? '').trim()).filter(Boolean))]
    logEvent('info', 'recipients.loaded', requestId, startedAt, {
      recipients: emails.length,
    })
    if (!emails.length) {
      logEvent('warn', 'recipients.none', requestId, startedAt)
      return json(202, { ok: true, skipped: true, reason: 'no_recipients' })
    }

    const timeoutMs = Math.max(3000, Number(optionalEnv('SMTP_TIMEOUT_MS', '10000')) || 10000)
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

    const createdAt = payload?.created_at ? new Date(payload.created_at).toISOString() : new Date().toISOString()
    const dashboardUrl = appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/admin/users` : ''
    const subject = `[${siteName}] New user created`
    const text = [
      `A new user has been created in ${siteName}.`,
      '',
      `User ID: ${userId}`,
      `Email: ${userEmail ?? '-'}`,
      `Created At: ${createdAt}`,
      dashboardUrl ? `Users Dashboard: ${dashboardUrl}` : '',
    ].filter(Boolean).join('\n')

    try {
      logEvent('info', 'smtp.send_attempt', requestId, startedAt, {
        recipients: emails.length,
        smtpHost: maskHost(smtpHost),
        smtpPort: smtpPort,
        smtpSecure,
      })
      await transport.sendMail({
        from: smtpFromName ? `${smtpFromName} <${smtpFromEmail}>` : smtpFromEmail,
        to: smtpFromEmail,
        bcc: emails,
        subject,
        text,
      })
    } catch (smtpError: any) {
      const smtpMessage = String(smtpError?.message ?? smtpError ?? 'Unknown SMTP error')
      logEvent('error', 'smtp.send_failed', requestId, startedAt, {
        error: smtpMessage,
        code: String(smtpError?.code ?? ''),
        command: String(smtpError?.command ?? ''),
        responseCode: Number(smtpError?.responseCode ?? 0) || null,
      })
      return json(502, { error: 'SMTP send failed', detail: smtpMessage })
    }

    logEvent('info', 'smtp.send_success', requestId, startedAt, {
      userId,
      recipients: emails.length,
    })

    return json(200, { ok: true, notified: emails.length })
  } catch (error: any) {
    const errorMessage = String(error?.message ?? error ?? 'Unhandled server error')
    logEvent('error', 'request.unhandled_error', requestId, startedAt, {
      error: errorMessage,
      stack: String(error?.stack ?? ''),
    })
    return json(500, { error: 'Unhandled server error', detail: errorMessage })
  }
})
