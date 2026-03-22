import type { H3Event } from 'h3'
import { sendMemberPurchaseNotificationEmail } from '~/server/services/notifications/member-purchase-email'
import { getServiceRoleClient } from '~/server/utils/supabase'

interface QueueJobRow {
  id: number
  payload: Record<string, any> | null
  attempt_count: number
  max_attempts: number
}

export interface QueueProcessSummary {
  claimed: number
  sent: number
  skipped: number
  failed: number
  retried: number
}

function backoffSeconds(attemptCount: number) {
  const safe = Math.max(1, Number(attemptCount) || 1)
  const exp = Math.min(6, safe)
  return Math.min(30 * 60, 30 * (2 ** exp))
}

async function markDone(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  id: number,
) {
  const { error } = await supabase
    .from('internal_job_queue')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      last_error: null,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', id)
  if (error)
    throw new Error(`[internal_job_queue:${id}] mark done failed: ${error.message}`)
}

async function markFailed(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  id: number,
  message: string,
) {
  const { error } = await supabase
    .from('internal_job_queue')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      last_error: message,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', id)
  if (error)
    throw new Error(`[internal_job_queue:${id}] mark failed failed: ${error.message}`)
}

async function markRetry(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  id: number,
  message: string,
  attemptCount: number,
) {
  const delay = backoffSeconds(attemptCount)
  const availableAt = new Date(Date.now() + delay * 1000).toISOString()
  const { error } = await supabase
    .from('internal_job_queue')
    .update({
      status: 'retry',
      available_at: availableAt,
      last_error: message,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', id)
  if (error)
    throw new Error(`[internal_job_queue:${id}] mark retry failed: ${error.message}`)
}

export async function enqueueMemberPurchaseNotifyQueue(
  event: H3Event,
  payload: { order_id: string },
) {
  const orderId = String(payload.order_id ?? '').trim()
  if (!orderId)
    return
  const supabase = await getServiceRoleClient(event)
  const { error } = await supabase
    .from('internal_job_queue')
    .insert({
      job_type: 'member_purchase_bank_transfer_notify',
      payload: { order_id: orderId },
      status: 'pending',
      available_at: new Date().toISOString(),
      max_attempts: 8,
    })
  if (error)
    throw new Error(`member purchase queue insert failed: ${error.message}`)
}

export async function processMemberPurchaseNotifyQueue(
  event: H3Event,
  options?: { limit?: number; worker?: string },
): Promise<QueueProcessSummary> {
  const limit = Math.max(1, Math.min(100, Number(options?.limit ?? 10)))
  const worker = String(options?.worker ?? `nuxt:${process.pid}:${Date.now()}`)
  const summary: QueueProcessSummary = {
    claimed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    retried: 0,
  }

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase.rpc('claim_internal_job_queue', {
    p_job_type: 'member_purchase_bank_transfer_notify',
    p_limit: limit,
    p_worker: worker,
  })
  if (error)
    throw new Error(`queue claim failed: ${error.message}`)

  const jobs = Array.isArray(data) ? (data as QueueJobRow[]) : []
  summary.claimed = jobs.length
  for (const job of jobs) {
    const payload = (job.payload ?? {}) as Record<string, any>
    const orderId = String(payload.order_id ?? '').trim()
    if (!orderId) {
      await markFailed(supabase, job.id, 'invalid_payload_missing_order_id')
      summary.failed += 1
      continue
    }

    try {
      const result = await sendMemberPurchaseNotificationEmail(event, {
        order_id: orderId,
      })

      if (result.status === 'sent') {
        await markDone(supabase, job.id)
        summary.sent += 1
        continue
      }

      if (result.status === 'skipped') {
        await markDone(supabase, job.id)
        summary.skipped += 1
        continue
      }

      if (job.attempt_count >= Number(job.max_attempts ?? 8)) {
        await markFailed(supabase, job.id, result.error)
        summary.failed += 1
      } else {
        await markRetry(supabase, job.id, result.error, Number(job.attempt_count ?? 1))
        summary.retried += 1
      }
    } catch (error: any) {
      const message = String(error?.message ?? error ?? 'queue_job_failed')
      if (job.attempt_count >= Number(job.max_attempts ?? 8)) {
        await markFailed(supabase, job.id, message)
        summary.failed += 1
      } else {
        await markRetry(supabase, job.id, message, Number(job.attempt_count ?? 1))
        summary.retried += 1
      }
    }
  }

  return summary
}
