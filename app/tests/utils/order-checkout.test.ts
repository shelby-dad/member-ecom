import { describe, expect, it } from 'vitest'
import {
  aggregateQuantityByVariant,
  aggregateStockByVariant,
  normalizeCheckoutItems,
  toOrderItemsRows,
} from '~/server/utils/order-checkout'

describe('order-checkout utils', () => {
  it('aggregates quantity by variant id', () => {
    const map = aggregateQuantityByVariant([
      { variant_id: 'v1', quantity: 1 },
      { variant_id: 'v1', quantity: 2 },
      { variant_id: 'v2', quantity: 3 },
    ])
    expect(map.get('v1')).toBe(3)
    expect(map.get('v2')).toBe(3)
  })

  it('normalizes and validates checkout items', () => {
    const quantity = new Map<string, number>([['v1', 2]])
    const rows = normalizeCheckoutItems(
      quantity,
      [{
        id: 'v1',
        name: 'M / Black',
        price: 25000,
        track_stock: true,
        products: {
          name: 'Plain Circle Neck Shirt',
          has_variants: true,
          track_stock: true,
        },
      }],
      { v1: 5 },
      {
        inactiveCartMessage: 'inactive',
        invalidVariantPriceMessage: 'invalid',
      },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].product_name).toBe('Plain Circle Neck Shirt')
    expect(rows[0].price).toBe(25000)
    expect(rows[0].quantity).toBe(2)
  })

  it('maps normalized items to order item rows', () => {
    const rows = toOrderItemsRows('o1', [
      {
        variant_id: 'v1',
        product_name: 'Product',
        variant_name: 'Default',
        price: 100,
        quantity: 3,
        track_stock: true,
      },
    ])
    expect(rows[0].order_id).toBe('o1')
    expect(rows[0].total).toBe(300)
  })

  it('throws when stock is insufficient', () => {
    const quantity = new Map<string, number>([['v1', 10]])
    expect(() =>
      normalizeCheckoutItems(
        quantity,
        [{
          id: 'v1',
          name: 'Default',
          price: 100,
          track_stock: true,
          products: { name: 'Product', has_variants: false, track_stock: true },
        }],
        { v1: 1 },
        {
          inactiveCartMessage: 'inactive',
          invalidVariantPriceMessage: 'invalid',
        },
      ),
    ).toThrowError(/Insufficient stock/)
  })

  it('aggregates stock rows by variant id', () => {
    const stock = aggregateStockByVariant([
      { variant_id: 'v1', quantity: 1 },
      { variant_id: 'v1', quantity: 4 },
      { variant_id: 'v2', quantity: 2 },
    ])
    expect(stock.v1).toBe(5)
    expect(stock.v2).toBe(2)
  })
})
