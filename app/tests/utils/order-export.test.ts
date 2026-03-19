import { describe, expect, it } from 'vitest'
import { formatOrderExportAddress, mapOrdersToExportRows } from '~/server/utils/order-export'

describe('order export utils', () => {
  it('formats address safely and falls back to dash', () => {
    expect(formatOrderExportAddress({})).toBe('-')
    expect(formatOrderExportAddress({
      shipping_name: 'John',
      shipping_line1: 'No 1',
      shipping_city: 'Yangon',
      shipping_country: 'Myanmar',
    })).toBe('John, No 1, Yangon, Myanmar')
  })

  it('maps rows for excel export', () => {
    const rows = mapOrdersToExportRows(
      [
        {
          order_number: 'ORD-ABCD1234',
          user_id: 'u1',
          status: 'delivered',
          total: 100000,
          payment_status: 'paid',
          discount_total: 0,
          created_at: '2026-03-18T01:00:00.000Z',
          updated_at: '2026-03-18T02:00:00.000Z',
        },
      ],
      {
        u1: { full_name: 'Smiley Ei', email: 'member@tenat-shop.com' },
      },
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]['#']).toBe(1)
    expect(rows[0]['Order #']).toBe('ORD-ABCD1234')
    expect(rows[0].Member).toBe('Smiley Ei')
    expect(rows[0].Email).toBe('member@tenat-shop.com')
    expect(rows[0]['Discount Amount']).toBe('-')
  })
})
