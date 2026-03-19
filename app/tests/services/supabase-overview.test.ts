import { describe, expect, it } from 'vitest'
import { buildTrafficKpis, normalizeSeries, parseProjectRefFromUrl } from '~/server/services/platform/supabase-overview'

describe('supabase platform overview service helpers', () => {
  it('parses project ref from supabase url', () => {
    expect(parseProjectRefFromUrl('https://abcxyzcompany.supabase.co')).toBe('abcxyzcompany')
    expect(parseProjectRefFromUrl('invalid-url')).toBe('')
  })

  it('normalizes series labels/values from heterogeneous payload rows', () => {
    const rows = normalizeSeries([
      { period_start: '2026-03-18T00:00:00Z', api_requests: 120 },
      { date: '2026-03-19', count: 250 },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0].value).toBe(120)
    expect(rows[1].value).toBe(250)
    expect(rows[0].label.length).toBeGreaterThan(0)
  })

  it('builds traffic kpis correctly', () => {
    const kpis = buildTrafficKpis([
      { label: 'Mar 18', value: 100 },
      { label: 'Mar 19', value: 200 },
      { label: 'Mar 20', value: 150 },
    ])

    expect(kpis.total_requests).toBe(450)
    expect(kpis.average_requests_per_day).toBe(150)
    expect(kpis.peak_day_label).toBe('Mar 19')
    expect(kpis.peak_day_requests).toBe(200)
    expect(kpis.latest_day_label).toBe('Mar 20')
    expect(kpis.latest_day_requests).toBe(150)
    expect(kpis.trend_percent).toBe(50)
  })

  it('returns zeroed kpis for empty series', () => {
    expect(buildTrafficKpis([])).toEqual({
      total_requests: 0,
      average_requests_per_day: 0,
      peak_day_label: '-',
      peak_day_requests: 0,
      latest_day_label: '-',
      latest_day_requests: 0,
      trend_percent: 0,
    })
  })
})
