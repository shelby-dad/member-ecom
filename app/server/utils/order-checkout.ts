import { createError } from 'h3'

interface CheckoutRequestItem {
  variant_id: string
  quantity: number
}

interface VariantProductInfo {
  name?: string | null
  has_variants?: boolean | null
  track_stock?: boolean | null
  is_active?: boolean | null
}

interface VariantInfo {
  id: string
  name?: string | null
  price?: number | null
  track_stock?: boolean | null
  products?: VariantProductInfo | null
}

interface StockRow {
  variant_id: string
  quantity?: number | null
}

export interface NormalizedCheckoutItem {
  variant_id: string
  product_name: string
  variant_name: string
  price: number
  quantity: number
  track_stock: boolean
}

interface NormalizeOptions {
  inactiveCartMessage: string
  invalidVariantPriceMessage: string
}

export function aggregateQuantityByVariant(items: CheckoutRequestItem[]) {
  const quantityByVariantId = new Map<string, number>()
  for (const item of items) {
    quantityByVariantId.set(item.variant_id, (quantityByVariantId.get(item.variant_id) ?? 0) + item.quantity)
  }
  return quantityByVariantId
}

export function aggregateStockByVariant(rows: StockRow[]) {
  const stockByVariantId: Record<string, number> = {}
  for (const row of rows) {
    stockByVariantId[row.variant_id] = (stockByVariantId[row.variant_id] ?? 0) + Number(row.quantity ?? 0)
  }
  return stockByVariantId
}

export function normalizeCheckoutItems(
  quantityByVariantId: Map<string, number>,
  variants: VariantInfo[],
  stockByVariantId: Record<string, number>,
  options: NormalizeOptions,
): NormalizedCheckoutItem[] {
  const variantIds = [...quantityByVariantId.keys()]
  const variantById = new Map((variants ?? []).map(v => [v.id, v]))
  if (variantIds.some(id => !variantById.has(id))) {
    throw createError({ statusCode: 400, message: options.inactiveCartMessage })
  }

  return variantIds.map((variantId) => {
    const variant = variantById.get(variantId) as VariantInfo
    const quantity = quantityByVariantId.get(variantId) ?? 0
    const product = variant.products
    const effectiveTrackStock = variant.track_stock ?? product?.track_stock ?? true
    const variantPrice = Number(variant.price ?? 0)

    if (product?.has_variants && variantPrice <= 0) {
      throw createError({ statusCode: 400, message: options.invalidVariantPriceMessage })
    }

    if (effectiveTrackStock && quantity > (stockByVariantId[variantId] ?? 0)) {
      throw createError({
        statusCode: 400,
        message: `Insufficient stock for "${product?.name ?? 'Product'} - ${variant.name ?? 'Variant'}".`,
      })
    }

    return {
      variant_id: variant.id,
      product_name: String(product?.name ?? ''),
      variant_name: String(variant.name ?? ''),
      price: variantPrice,
      quantity,
      track_stock: effectiveTrackStock,
    }
  })
}

export function toOrderItemsRows(orderId: string, items: NormalizedCheckoutItem[]) {
  return items.map(i => ({
    order_id: orderId,
    variant_id: i.variant_id,
    product_name: i.product_name,
    variant_name: i.variant_name,
    price: i.price,
    quantity: i.quantity,
    track_stock: i.track_stock !== false,
    total: i.price * i.quantity,
  }))
}
