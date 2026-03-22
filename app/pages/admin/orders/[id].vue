<template>
  <div v-if="loading">
    <v-card class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="heading" class="mb-3" />
        <v-skeleton-loader type="paragraph" />
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="table-heading" class="mb-2" />
        <v-skeleton-loader v-for="n in 5" :key="`admin-order-detail-skeleton-${n}`" type="table-row-divider" class="mb-1" />
      </v-card-text>
    </v-card>
  </div>
  <div v-else-if="order">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
      <h1 class="text-h4">
        Order {{ order.order_number }}
      </h1>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-file-download-outline"
        :to="`/print/invoice/${id}?from=admin`"
      >
        Download Invoice
      </v-btn>
    </div>
    <v-card class="mb-4">
      <v-card-title>Status</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedStatus"
          :items="['pending','confirmed','processing','shipped','delivered','cancelled']"
          label="Status"
          variant="outlined"
          @update:model-value="onStatusChange"
        />
        <div v-if="order.estimate_delivery_start || order.estimate_delivery_end" class="text-body-2 mt-2">
          <strong>Estimate delivery:</strong>
          {{ formatEstimateRange(order.estimate_delivery_start, order.estimate_delivery_end) }}
        </div>
        <div v-if="order.delivery_name" class="text-body-2 mt-2">
          <strong>Delivery Name:</strong>
          {{ order.delivery_name }}
        </div>
        <v-btn
          v-if="canDeleteOrder"
          color="error"
          variant="outlined"
          class="mt-3"
          :loading="deleting"
          @click="showDeleteDialog = true"
        >
          Delete order
        </v-btn>
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Info</v-card-title>
      <v-card-text class="text-body-2">
        <div class="info-grid">
          <div class="info-row">
            <span class="info-key">Name</span>
            <span class="info-value">{{ member?.full_name || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Email</span>
            <span class="info-value">{{ member?.email || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Phone</span>
            <span class="info-value">{{ member?.mobile_number || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Address</span>
            <span class="info-value">{{ formatAddress(order) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Order Date</span>
            <span class="info-value">{{ formatDateTime(order.created_at) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Source</span>
            <span class="info-value">{{ order.source || '-' }}</span>
          </div>
          <div v-if="order.estimate_delivery_start || order.estimate_delivery_end" class="info-row">
            <span class="info-key">Estimated Delivery</span>
            <span class="info-value">{{ formatEstimateRange(order.estimate_delivery_start, order.estimate_delivery_end) }}</span>
          </div>
          <div v-if="order.delivery_name" class="info-row">
            <span class="info-key">Delivery Name</span>
            <span class="info-value">{{ order.delivery_name }}</span>
          </div>
        </div>
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Items</v-card-title>
      <v-table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in orderItems" :key="i.id">
            <td>{{ i.product_name }}</td>
            <td>{{ i.variant_name }}</td>
            <td>{{ formatPrice(i.price) }}</td>
            <td>{{ i.quantity }}</td>
            <td>{{ formatPrice(i.total) }}</td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text>
        <div class="summary-grid">
          <div class="summary-row">
            <span class="summary-key">Discount Amount</span>
            <span class="summary-value">{{ formatDiscount(order.discount_total) }}</span>
          </div>
          <div class="summary-row summary-row--total">
            <span class="summary-key">Total Amount</span>
            <span class="summary-value">{{ formatPrice(order.total) }}</span>
          </div>
        </div>
      </v-card-text>
    </v-card>
    <v-card>
      <v-card-title>Payments</v-card-title>
      <v-card-text class="text-body-2 pb-0">
        <div class="info-grid mb-3">
          <div class="info-row">
            <span class="info-key">Payment Method</span>
            <span class="info-value">{{ formatPaymentMethod(order.payment_method_type) }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Payment Date</span>
            <span class="info-value">{{ formatDateTime(order.paid_at) }}</span>
          </div>
        </div>
      </v-card-text>
      <v-table v-if="submissions.length">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Amount</th>
            <th>Transaction ID</th>
            <th>Slip</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in submissions" :key="s.id">
            <td>{{ s.invoice_number || '–' }}</td>
            <td>{{ formatPrice(s.amount) }}</td>
            <td>{{ s.transaction_id || '–' }}</td>
            <td>
              <v-btn
                v-if="s.slip_url"
                class="payment-slip-thumb"
                variant="text"
                @click="openImageViewer(s.slip_url)"
              >
                <v-img :src="s.slip_url" cover width="40" height="40" />
              </v-btn>
              <span v-else>–</span>
            </td>
            <td>{{ s.status }}</td>
            <td>
              <v-btn v-if="s.status === 'pending'" size="small" color="success" class="me-1" @click="verify(s.id, 'verified')">Verify</v-btn>
              <v-btn v-if="s.status === 'pending'" size="small" color="error" @click="verify(s.id, 'rejected')">Reject</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text v-else class="text-medium-emphasis">
        No payment submissions.
      </v-card-text>
    </v-card>
    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm order deletion</v-card-title>
        <v-card-text>
          This is a soft delete. Order <strong>{{ order.order_number }}</strong> will be marked deleted and removed from order screens.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleting" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteOrder">Confirm delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showShippedDialog" max-width="620">
      <v-card>
        <v-card-title>Mark as shipped</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-2">
            You can optionally set an estimate delivery range.
          </p>
          <DateRangePickerField
            v-model="estimateRange"
            label="Estimate delivery range (optional)"
            max-width="100%"
            value-format="iso"
            :emit-on-close="true"
          />
          <v-text-field
            v-model="deliveryName"
            label="Delivery Name (optional)"
            variant="outlined"
            density="comfortable"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="updatingStatus" @click="cancelShippedDialog">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="updatingStatus" @click="confirmShippedStatus">
            Update status
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="imageViewerOpen" max-width="920">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Slip Viewer</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="imageViewerOpen = false" />
        </v-card-title>
        <v-card-text class="d-flex justify-center">
          <v-img
            v-if="imageViewerUrl"
            :src="imageViewerUrl"
            class="payment-slip-viewer"
            contain
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
  <div v-else class="text-center py-8 text-medium-emphasis">
    Order not found.
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
setPageLayout('admin')
const { formatPrice } = usePricingFormat()

const route = useRoute()
const id = route.params.id as string
const loading = ref(true)
const order = ref<any>(null)
const orderItems = ref<any[]>([])
const submissions = ref<any[]>([])
const member = ref<any>(null)
const showDeleteDialog = ref(false)
const showShippedDialog = ref(false)
const deleting = ref(false)
const canDeleteOrder = ref(false)
const updatingStatus = ref(false)
const imageViewerOpen = ref(false)
const imageViewerUrl = ref('')
const selectedStatus = ref<string>('')
const estimateRange = ref<{ start: string | null, end: string | null }>({ start: null, end: null })
const deliveryName = ref('')

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/admin/orders/${id}`)
    order.value = data?.order ?? null
    orderItems.value = data?.items ?? []
    submissions.value = data?.submissions ?? []
    member.value = data?.member ?? null
    selectedStatus.value = order.value?.status ?? ''
  }
  catch {
    await navigateTo('/admin/orders', { replace: true })
  }
  finally {
    loading.value = false
  }
}

async function updateStatus(status: string, estimateStart?: string | null, estimateEnd?: string | null, shippedDeliveryName?: string | null) {
  if (!order.value)
    return
  updatingStatus.value = true
  try {
    await $fetch(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      body: {
        status,
        estimate_delivery_start: status === 'shipped' ? (estimateStart ?? null) : null,
        estimate_delivery_end: status === 'shipped' ? (estimateEnd ?? null) : null,
        delivery_name: status === 'shipped' ? (String(shippedDeliveryName ?? '').trim() || null) : null,
      },
    })
    await load()
  }
  finally {
    updatingStatus.value = false
  }
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

function onStatusChange(nextStatus: string) {
  if (!order.value)
    return
  if (!nextStatus || nextStatus === order.value.status) {
    selectedStatus.value = order.value.status
    return
  }
  if (nextStatus === 'shipped') {
    estimateRange.value = {
      start: order.value.estimate_delivery_start ?? null,
      end: order.value.estimate_delivery_end ?? null,
    }
    deliveryName.value = String(order.value.delivery_name ?? '').trim()
    showShippedDialog.value = true
    return
  }
  updateStatus(nextStatus)
}

function cancelShippedDialog() {
  showShippedDialog.value = false
  selectedStatus.value = order.value?.status ?? ''
}

async function confirmShippedStatus() {
  await updateStatus('shipped', estimateRange.value.start, estimateRange.value.end, deliveryName.value)
  showShippedDialog.value = false
}

function formatEstimateRange(start: string | null | undefined, end: string | null | undefined) {
  const fmt = (v: string) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(v))
  if (start && end)
    return `${fmt(start)} - ${fmt(end)}`
  if (start)
    return fmt(start)
  if (end)
    return fmt(end)
  return '-'
}

function formatPaymentMethod(value: string | null | undefined) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return '-'
  if (raw === 'bank_transfer')
    return 'Bank Transfer'
  if (raw === 'cod')
    return 'Cash on Delivery'
  if (raw === 'cash')
    return 'Cash'
  if (raw === 'wallet')
    return 'Wallet'
  return raw
}

function formatDateTime(value: string | null | undefined) {
  if (!value)
    return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatDiscount(value: unknown) {
  const n = Number(value ?? 0)
  if (!n)
    return '-'
  return formatPrice(n)
}

function openImageViewer(url?: string | null) {
  const next = String(url ?? '').trim()
  if (!next)
    return
  imageViewerUrl.value = next
  imageViewerOpen.value = true
}

async function verify(subId: string, status: 'verified' | 'rejected') {
  await $fetch(`/api/admin/payment-submissions/${subId}/verify`, { method: 'PUT', body: { status } })
  await load()
}

async function deleteOrder() {
  if (!order.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    await navigateTo('/admin/orders', { replace: true })
  }
  finally {
    deleting.value = false
    showDeleteDialog.value = false
  }
}

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  canDeleteOrder.value = profile?.role === 'superadmin'
  await load()
})
</script>

<style scoped>
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-key {
  min-width: 140px;
  font-weight: 600;
}

.info-value {
  flex: 1;
  word-break: break-word;
}

.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 420px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.summary-key {
  color: rgba(71, 85, 105, 0.92);
}

.summary-value {
  font-weight: 700;
}

.summary-row--total .summary-key,
.summary-row--total .summary-value {
  font-size: 1.02rem;
}

.payment-slip-thumb {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
}

.payment-slip-viewer {
  width: 100%;
  max-height: 72vh;
}
</style>
