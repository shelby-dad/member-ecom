import { describe, expect, it } from 'vitest'
import { generateOptionCombinations, generateVariantSku, normalizeOptionSets, optionValuesToName } from '~/server/utils/product-variants'

describe('product variants option model', () => {
  it('normalizes text option values into label/value pairs', () => {
    const sets = normalizeOptionSets([{ name: 'Size', type: 'text', values: ['S', 'M'] }])
    expect(sets[0].values).toEqual([
      { label: 'S', value: 'S' },
      { label: 'M', value: 'M' },
    ])
  })

  it('uses labels for generated variant combinations and names', () => {
    const combos = generateOptionCombinations([
      { name: 'Color', type: 'color', values: [{ label: 'Black', value: '#000000' }] },
      { name: 'Pattern', type: 'image', values: [{ label: 'Floral', value: '/patterns/floral.png' }] },
    ])
    expect(combos).toEqual([{ Color: 'Black', Pattern: 'Floral' }])
    expect(optionValuesToName(combos[0], ['Color', 'Pattern'])).toBe('Black / Floral')
  })

  it('generates SKU when frontend does not provide one', () => {
    const sku = generateVariantSku('my-shirt', { Size: 'M', Color: 'Black' })
    expect(sku).toMatch(/^MYSHIRT-[A-Z0-9]+-[A-Z0-9]{5}$/)
  })
})
