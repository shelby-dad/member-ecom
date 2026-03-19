export interface OrderExportOrderRow {
  order_number?: string | null
  user_id?: string | null
  status?: string | null
  total?: number | string | null
  payment_status?: string | null
  discount_total?: number | string | null
  created_at?: string | null
  updated_at?: string | null
  shipping_name?: string | null
  shipping_line1?: string | null
  shipping_line2?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_postal_code?: string | null
  shipping_country?: string | null
}

export interface OrderExportProfileRow {
  full_name: string | null
  email: string | null
}

export interface OrderExportSheetRow {
  '#': number
  'Order #': string
  Status: string
  Member: string
  Email: string
  Address: string
  Total: number
  'Payment Status': string
  'Discount Amount': number | string
  'Created At': string
  'Updated At': string
}

export function formatOrderExportDateTime(value: string | null | undefined) {
  if (!value)
    return '-'
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatOrderExportAddress(order: OrderExportOrderRow) {
  const parts = [
    order.shipping_name,
    order.shipping_line1,
    order.shipping_line2,
    order.shipping_city,
    order.shipping_state,
    order.shipping_postal_code,
    order.shipping_country,
  ].map(v => String(v ?? '').trim()).filter(Boolean)
  return parts.join(', ') || '-'
}

export function mapOrdersToExportRows(
  orders: OrderExportOrderRow[],
  profileMap: Record<string, OrderExportProfileRow>,
): OrderExportSheetRow[] {
  return orders.map((order, index) => {
    const member = profileMap[String(order.user_id ?? '')] ?? { full_name: null, email: null }
    const discount = Number(order.discount_total ?? 0)
    return {
      '#': index + 1,
      'Order #': String(order.order_number ?? ''),
      Status: String(order.status ?? ''),
      Member: String(member.full_name ?? '-'),
      Email: String(member.email ?? '-'),
      Address: formatOrderExportAddress(order),
      Total: Number(order.total ?? 0),
      'Payment Status': String(order.payment_status ?? '-'),
      'Discount Amount': discount === 0 ? '-' : discount,
      'Created At': formatOrderExportDateTime(order.created_at),
      'Updated At': formatOrderExportDateTime(order.updated_at),
    }
  })
}
