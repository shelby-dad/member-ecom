import type { H3Event } from 'h3'

interface SeriesPoint {
  label: string
  value: number
}

export interface SupabasePlatformOverview {
  configured: boolean
  available: boolean
  project_ref: string | null
  organization_id: string | null
  plan_name: string
  status: string
  estimated_monthly_cost_usd: number | null
  api_requests: SeriesPoint[]
  traffic_kpis: {
    total_requests: number
    average_requests_per_day: number
    peak_day_label: string
    peak_day_requests: number
    latest_day_label: string
    latest_day_requests: number
    trend_percent: number
  }
  note: string
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function toLabel(value: unknown, fallback: string) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toDateLabel(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime()))
    return raw
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function parseProjectRefFromUrl(url: string) {
  const value = String(url || '').trim()
  if (!value)
    return ''
  try {
    const host = new URL(value).hostname
    return host.split('.')[0] || ''
  } catch {
    return ''
  }
}

export function normalizeSeries(input: any): SeriesPoint[] {
  const source = Array.isArray(input)
    ? input
    : (Array.isArray(input?.result) ? input.result : [])
  const list: SeriesPoint[] = source.map((row: any, index: number) => {
    const dateLikeValue = row?.period_start
      ?? row?.periodStart
      ?? row?.period_end
      ?? row?.periodEnd
      ?? row?.time_bucket
      ?? row?.timeBucket
      ?? row?.window_start
      ?? row?.windowStart
      ?? row?.bucket_start
      ?? row?.bucketStart
      ?? row?.ts
      ?? row?.at
      ?? row?.timestamp
      ?? row?.date
      ?? row?.day
    const label = toLabel(
      row?.label
        ?? toDateLabel(dateLikeValue)
        ?? row?.bucket
        ?? row?.period,
      source.length === 1 ? 'Current' : `Point ${index + 1}`,
    )
    const value = toNumber(
      row?.value
        ?? row?.count
        ?? row?.api_requests
        ?? row?.requests
        ?? row?.total,
    )
    return { label, value }
  })
  return list.filter(item => item.value > 0).slice(-30)
}

export function buildTrafficKpis(series: SeriesPoint[]) {
  if (!series.length) {
    return {
      total_requests: 0,
      average_requests_per_day: 0,
      peak_day_label: '-',
      peak_day_requests: 0,
      latest_day_label: '-',
      latest_day_requests: 0,
      trend_percent: 0,
    }
  }

  const total = series.reduce((sum, row) => sum + toNumber(row.value), 0)
  const average = total / series.length
  const peak = series.reduce((best, row) => row.value > best.value ? row : best, series[0])
  const latest = series[series.length - 1]
  const first = series[0]
  const trendBase = Math.max(1, toNumber(first.value))
  const trendPercent = ((toNumber(latest.value) - toNumber(first.value)) / trendBase) * 100

  return {
    total_requests: Math.round(total),
    average_requests_per_day: Math.round(average),
    peak_day_label: peak.label,
    peak_day_requests: Math.round(toNumber(peak.value)),
    latest_day_label: latest.label,
    latest_day_requests: Math.round(toNumber(latest.value)),
    trend_percent: Number.isFinite(trendPercent) ? Math.round(trendPercent * 10) / 10 : 0,
  }
}

export async function getSupabasePlatformOverview(event: H3Event): Promise<SupabasePlatformOverview> {
  const config = useRuntimeConfig(event)
  const pat = String(config.supabaseManagementPat ?? '').trim()
  const orgId = String(config.supabaseOrgId ?? '').trim()
  const projectRef = String(config.supabaseProjectRef ?? '').trim() || parseProjectRefFromUrl(String(config.public.supabaseUrl ?? ''))

  if (!pat || !projectRef) {
    return {
      configured: false,
      available: false,
      project_ref: projectRef || null,
      organization_id: orgId || null,
      plan_name: '-',
      status: '-',
      estimated_monthly_cost_usd: null,
      api_requests: [],
      traffic_kpis: {
        total_requests: 0,
        average_requests_per_day: 0,
        peak_day_label: '-',
        peak_day_requests: 0,
        latest_day_label: '-',
        latest_day_requests: 0,
        trend_percent: 0,
      },
      note: 'Set SUPABASE_MANAGEMENT_PAT and SUPABASE_PROJECT_REF (or SUPABASE_URL) to enable platform analytics.',
    }
  }

  const headers = { Authorization: `Bearer ${pat}` }
  const base = 'https://api.supabase.com/v1'

  let projectInfo: any = null
  let apiRequestsRaw: any = null
  let note = 'Connected to Supabase Management API.'

  try {
    projectInfo = await $fetch(`${base}/projects/${projectRef}`, { headers })
  } catch {
    note = 'Connected, but project metadata endpoint returned limited data.'
  }

  try {
    apiRequestsRaw = await $fetch(`${base}/projects/${projectRef}/analytics/endpoints/usage.api-requests-count`, {
      headers,
    })
  } catch {
    // Keep response available with partial metadata even when usage endpoint is not available.
    if (note === 'Connected to Supabase Management API.')
      note = 'Connected, but usage endpoint returned limited data.'
  }

  const planName = toLabel(
    projectInfo?.plan
      ?? projectInfo?.subscription_tier
      ?? projectInfo?.organization?.plan
      ?? projectInfo?.tier,
    '-',
  )

  const status = toLabel(projectInfo?.status, '-')
  const estimatedMonthlyCostUsdRaw = projectInfo?.billing?.estimated_monthly_cost_usd
    ?? projectInfo?.usage?.estimated_monthly_cost_usd
    ?? projectInfo?.cost?.monthly_usd

  const apiRequests = normalizeSeries(apiRequestsRaw)
  const trafficKpis = buildTrafficKpis(apiRequests)

  return {
    configured: true,
    available: true,
    project_ref: projectRef || null,
    organization_id: orgId || null,
    plan_name: planName,
    status,
    estimated_monthly_cost_usd: estimatedMonthlyCostUsdRaw == null ? null : toNumber(estimatedMonthlyCostUsdRaw),
    api_requests: apiRequests,
    traffic_kpis: trafficKpis,
    note,
  }
}
