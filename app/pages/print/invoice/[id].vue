<template>
  <div class="invoice-page">
    <div class="invoice-toolbar no-print">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="goBack">Back</v-btn>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-printer" @click="printPage">Print / Save PDF</v-btn>
    </div>

    <v-card v-if="loading" class="invoice-sheet" elevation="0" rounded="lg">
      <v-card-text class="invoice-body">
        <v-skeleton-loader type="heading" class="mb-4" />
        <v-skeleton-loader type="image" height="120" class="mb-4" />
        <v-skeleton-loader type="table-heading" class="mb-2" />
        <v-skeleton-loader v-for="n in 5" :key="`invoice-skeleton-row-${n}`" type="table-row-divider" class="mb-1" />
      </v-card-text>
    </v-card>

    <v-card v-else class="invoice-sheet" elevation="0" rounded="lg">
      <v-card-text class="invoice-body">
        <div class="invoice-headline">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-subtitle">
            {{ latestInvoiceNumber || 'Invoice document' }}
          </div>
        </div>
        <div class="invoice-header">
          <div class="invoice-shop-logo-wrap">
            <img v-if="shopLogoUrl" :src="shopLogoUrl" alt="Shop logo" class="invoice-shop-logo">
          </div>
          <div class="invoice-shop-meta">
            <div class="invoice-shop-name">{{ settings.shop_name || 'Shop' }}</div>
            <div v-if="settings.shop_address">{{ settings.shop_address }}</div>
            <div v-if="settings.mobile_number">{{ settings.mobile_number }}</div>
            <div v-if="settings.shop_email">{{ settings.shop_email }}</div>
          </div>
          <div class="invoice-order-meta">
            <div class="invoice-meta-row"><span>Invoice</span><strong>{{ latestInvoiceNumber || '-' }}</strong></div>
            <div class="invoice-meta-row"><span>Order</span><strong>{{ order?.order_number || '-' }}</strong></div>
            <div class="invoice-meta-row"><span>Order Date</span><strong>{{ formatDate(order?.created_at) }}</strong></div>
            <div class="invoice-meta-row"><span>Payment</span><strong>{{ formatPaymentMethod(order?.payment_method_type) }}</strong></div>
            <div class="invoice-meta-row"><span>Status</span><strong>{{ order?.status || '-' }}</strong></div>
          </div>
        </div>

        <div class="invoice-info-grid mt-4">
          <div class="invoice-billto">
            <div class="text-caption text-medium-emphasis">Bill To</div>
            <div><strong>{{ member?.full_name || '-' }}</strong></div>
            <div>{{ member?.email || '-' }}</div>
            <div>{{ member?.mobile_number || '-' }}</div>
            <div>{{ formatAddress(order) }}</div>
          </div>
        </div>

        <v-table class="mt-5 invoice-items-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">#</th>
              <th class="text-left">Product</th>
              <th class="text-left">Variant</th>
              <th class="text-right">Price</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="item.id || idx">
              <td>{{ idx + 1 }}</td>
              <td>{{ item.product_name || '-' }}</td>
              <td>{{ item.variant_name || '-' }}</td>
              <td class="text-right">{{ formatPrice(Number(item.price ?? 0)) }}</td>
              <td class="text-right">{{ Number(item.quantity ?? 0) }}</td>
              <td class="text-right">{{ formatPrice(Number(item.total ?? 0)) }}</td>
            </tr>
          </tbody>
        </v-table>
        <div class="invoice-summary-wrap">
          <div class="invoice-total-box">
            <div class="invoice-total-line"><span>Subtotal</span><strong>{{ formatPrice(Number(order?.subtotal ?? 0)) }}</strong></div>
            <div class="invoice-total-line"><span>Discount</span><strong>{{ formatPrice(Number(order?.discount_total ?? 0)) }}</strong></div>
            <div class="invoice-total-line total"><span>Total</span><strong>{{ formatPrice(Number(order?.total ?? 0)) }}</strong></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
    <div class="invoice-print-footer">
      Generated on {{ formatDate(new Date().toISOString()) }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'role', layout: false })
const { formatPrice } = usePricingFormat()

const route = useRoute()
const orderId = String(route.params.id ?? '')
const config = useRuntimeConfig()
const source = String(route.query.from ?? '').trim().toLowerCase()
const loading = ref(true)

const settings = ref<any>({
  shop_logo: '',
  shop_name: '',
  shop_address: '',
  shop_email: '',
  mobile_number: '',
})
const order = ref<any | null>(null)
const items = ref<any[]>([])
const member = ref<any | null>(null)
const submissions = ref<any[]>([])

const shopLogoUrl = computed(() => {
  const path = String(settings.value?.shop_logo ?? '').trim()
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
})

const latestInvoiceNumber = computed(() => {
  const first = submissions.value[0]
  return String(first?.invoice_number ?? '') || ''
})

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function formatPaymentMethod(value: string | null | undefined) {
  const key = String(value ?? '').trim()
  if (!key) return '-'
  return key.replaceAll('_', ' ').replace(/\b\w/g, m => m.toUpperCase())
}

function formatAddress(target: any) {
  const parts = [
    target?.shipping_name,
    target?.shipping_line1,
    target?.shipping_line2,
    target?.shipping_city,
    target?.shipping_state,
    target?.shipping_postal_code,
    target?.shipping_country,
  ]
    .map(x => String(x ?? '').trim())
    .filter(Boolean)
  return parts.join(', ') || '-'
}

async function load() {
  const [settingsData, detailData] = await Promise.all([
    $fetch<any>('/api/settings/public'),
    $fetch<any>(`/api/print/orders/${orderId}`),
  ])

  settings.value = {
    shop_logo: String(settingsData?.shop_logo ?? ''),
    shop_name: String(settingsData?.shop_name ?? ''),
    shop_address: String(settingsData?.shop_address ?? ''),
    shop_email: String(settingsData?.shop_email ?? ''),
    mobile_number: String(settingsData?.mobile_number ?? ''),
  }
  order.value = detailData?.order ?? null
  items.value = Array.isArray(detailData?.items) ? detailData.items : []
  member.value = detailData?.member ?? null
  submissions.value = Array.isArray(detailData?.submissions) ? detailData.submissions : []
}

function printPage() {
  window.print()
}

function goBack() {
  if (source === 'member') {
    navigateTo(`/member/orders/${orderId}`)
    return
  }
  if (source === 'staff') {
    navigateTo('/staff/pos')
    return
  }
  if (source === 'admin') {
    navigateTo(`/admin/orders/${orderId}`)
    return
  }
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  navigateTo('/member/orders')
}

onMounted(async () => {
  if (!orderId)
    return
  loading.value = true
  try {
    await load()
  }
  catch {
    if (source === 'admin')
      navigateTo('/admin/orders', { replace: true })
    else if (source === 'staff')
      navigateTo('/staff/pos', { replace: true })
    else
      navigateTo('/member/orders', { replace: true })
  }
  finally {
    loading.value = false
  }
})
</script>

<style scoped>
.invoice-page {
  background: #e8edf5;
  min-height: 100vh;
  padding: 20px 16px 28px;
}

.invoice-toolbar {
  width: min(210mm, calc(100vw - 32px));
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-sheet {
  width: 210mm;
  min-height: 297mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15);
}

.invoice-body {
  padding: 13mm 12mm;
}

.invoice-headline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.invoice-title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.invoice-subtitle {
  font-size: 0.85rem;
  color: rgba(51, 65, 85, 0.86);
}

.invoice-header {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.invoice-shop-logo-wrap {
  display: flex;
  justify-content: center;
}

.invoice-shop-logo {
  width: 112px;
  height: 112px;
  object-fit: cover;
  border-radius: 10px;
}

.invoice-shop-name {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.invoice-order-meta {
  font-size: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 10px 12px;
}

.invoice-meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.invoice-meta-row > span {
  color: rgba(71, 85, 105, 0.88);
}

.invoice-meta-row > strong {
  text-align: right;
}

.invoice-info-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: flex-start;
}

.invoice-billto {
  max-width: 65%;
}

.invoice-total-box {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}

.invoice-summary-wrap {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.invoice-summary-wrap .invoice-total-box {
  width: min(340px, 100%);
}

.invoice-total-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.invoice-total-line.total {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(100, 116, 139, 0.65);
  font-size: 1.02rem;
}

.invoice-items-table :deep(table) {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  overflow: hidden;
}

.invoice-items-table :deep(th) {
  background: rgba(226, 232, 240, 0.55);
  font-weight: 700;
}

.invoice-items-table :deep(th),
.invoice-items-table :deep(td) {
  white-space: nowrap;
}

.invoice-print-footer {
  display: none;
}

@media screen and (max-width: 760px) {
  .invoice-sheet {
    min-height: auto;
  }

  .invoice-body {
    padding: 18px 14px;
  }

  .invoice-headline {
    flex-direction: column;
    align-items: flex-start;
  }

  .invoice-header,
  .invoice-info-grid {
    grid-template-columns: 1fr;
  }

  .invoice-billto {
    max-width: 100%;
  }

  .invoice-items-table :deep(th),
  .invoice-items-table :deep(td) {
    white-space: normal;
  }

  .invoice-summary-wrap {
    justify-content: stretch;
  }

  .invoice-total-box {
    width: 100%;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  .no-print {
    display: none !important;
  }

  .invoice-page {
    background: #fff;
    padding: 0;
  }

  .invoice-sheet {
    width: 100%;
    max-width: none;
    min-height: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    margin: 0;
  }

  .invoice-body {
    padding: 10mm 10mm 14mm;
  }

  .invoice-header {
    grid-template-columns: 100px minmax(0, 1fr) 270px;
    gap: 12px;
  }

  .invoice-billto {
    max-width: 100%;
  }

  .invoice-summary-wrap {
    justify-content: flex-end;
  }

  .invoice-summary-wrap .invoice-total-box {
    width: 320px;
    max-width: 100%;
  }

  :deep(.v-table) {
    font-size: 11px;
  }

  .invoice-print-footer {
    display: block;
    position: fixed;
    left: 10mm;
    right: 10mm;
    bottom: 6mm;
    font-size: 10px;
    color: #64748b;
  }
}
</style>
