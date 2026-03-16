<template>
  <div>
    <h1 class="text-h4 mb-4">
      Orders
    </h1>

    <div class="d-flex align-center ga-2 mb-3 flex-wrap">
      <v-text-field
        v-model="search"
        label="Search"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        style="max-width: 420px"
      />
      <v-select
        v-model="statusFilter"
        :items="statusOptions"
        item-title="title"
        item-value="value"
        label="Status"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width: 220px"
      />
      <v-btn
        v-if="selectedOrderIds.length > 0"
        size="small"
        variant="outlined"
        color="primary"
        @click="showBulkStatusDialog = true"
      >
        {{ selectedOrderIds.length }} selected
      </v-btn>
    </div>

    <v-data-table-server
      v-model="selectedOrderIds"
      v-model:page="page"
      v-model:items-per-page="perPage"
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="orders"
      :items-length="total"
      :items-per-page-options="perPageOptions"
      :loading="loading"
      item-value="id"
      show-select
      class="elevation-0 admin-orders-table"
    >
      <template #item.order_number="{ item }">
        <NuxtLink :to="`/admin/orders/${item.id}`" class="text-primary text-decoration-none font-weight-medium">
          {{ item.order_number }}
        </NuxtLink>
      </template>
      <template #item.status="{ item }">
        <v-chip size="small" :color="statusColor(item.status)">
          {{ item.status }}
        </v-chip>
      </template>
      <template #item.member_name="{ item }">
        {{ item.member_name || '–' }}
      </template>
      <template #item.member_email="{ item }">
        {{ item.member_email || '–' }}
      </template>
      <template #item.shipping_address="{ item }">
        {{ formatAddress(item) }}
      </template>
      <template #item.total="{ item }">
        {{ formatPrice(Number(item.total ?? 0)) }}
      </template>
      <template #item.payment_status="{ item }">
        {{ item.payment_status ? item.payment_status : '-' }}
      </template>
      <template #item.discount_total="{ item }">
        {{ formatDiscount(item.discount_total) }}
      </template>
      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
      <template #item.updated_at="{ item }">
        {{ formatDate(item.updated_at) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" icon="mdi-eye-outline" :to="`/admin/orders/${item.id}`" />
        <v-btn
          v-if="canDeleteOrders"
          size="small"
          variant="text"
          icon="mdi-trash-can"
          color="error"
          :loading="deletingId === item.id"
          @click="openDeleteDialog(item)"
        />
      </template>
    </v-data-table-server>

    <v-dialog v-model="showBulkStatusDialog" max-width="620">
      <v-card>
        <v-card-title>Update selected orders</v-card-title>
        <v-card-text>
          <div class="mb-2 text-body-2">
            {{ selectedOrderIds.length }} order(s) selected.
          </div>
          <v-select
            v-model="bulkStatus"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="New status"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <div v-if="bulkStatus === 'shipped'" class="mb-1">
            <div class="text-caption text-medium-emphasis mb-2">
              Estimate delivery range (optional)
            </div>
            <DateRangePickerField
              v-model="estimateRange"
              label="Estimate delivery range"
              max-width="280px"
              value-format="iso"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="bulkSaving" @click="showBulkStatusDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="bulkSaving" :disabled="!selectedOrderIds.length || !bulkStatus" @click="applyBulkStatus">
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm order deletion</v-card-title>
        <v-card-text>
          This is a soft delete. Order
          <strong v-if="selectedOrder"> {{ selectedOrder.order_number }}</strong>
          will be marked deleted and hidden from order lists.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deletingId !== null" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" :disabled="!selectedOrder" :loading="deletingId === selectedOrder?.id" @click="confirmDelete">
            Confirm delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const { formatPrice } = usePricingFormat()
const orders = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const perPageOptions = [25, 50, 100]
const sortBy = ref<Array<{ key: string, order: 'asc' | 'desc' }>>([{ key: 'created_at', order: 'desc' }])
const selectedOrderIds = ref<string[]>([])
const search = ref('')
const statusFilter = ref('')
const showBulkStatusDialog = ref(false)
const bulkStatus = ref<string>('')
const estimateRange = ref<{ start: string | null, end: string | null }>({ start: null, end: null })
const bulkSaving = ref(false)
const showDeleteDialog = ref(false)
const selectedOrder = ref<any | null>(null)
const deletingId = ref<string | null>(null)
const actorRole = ref<'superadmin' | 'admin' | 'staff' | 'member' | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const canDeleteOrders = computed(() => actorRole.value === 'superadmin')
const statusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Processing', value: 'processing' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' },
]

const headers = [
  { title: 'Order #', key: 'order_number', sortable: true, width: '160px' },
  { title: 'Status', key: 'status', sortable: true, width: '130px' },
  { title: 'Member', key: 'member_name', sortable: true, width: '180px' },
  { title: 'Email', key: 'member_email', sortable: true, width: '220px' },
  { title: 'Address', key: 'shipping_address', sortable: false, width: '300px' },
  { title: 'Total', key: 'total', sortable: true, width: '130px' },
  { title: 'Payment Status', key: 'payment_status', sortable: false, width: '140px' },
  { title: 'Discount Amount', key: 'discount_total', sortable: false, width: '150px' },
  { title: 'Created', key: 'created_at', sortable: true, width: '170px' },
  { title: 'Updated', key: 'updated_at', sortable: true, width: '170px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
]

function formatDate(value: string) {
  if (!value) return '–'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    pending: 'warning',
    confirmed: 'info',
    processing: 'primary',
    shipped: 'secondary',
    delivered: 'success',
    cancelled: 'error',
  }
  return m[s] ?? 'default'
}

function formatAddress(order: any) {
  const parts = [
    order?.shipping_name,
    order?.shipping_line1,
    order?.shipping_line2,
    order?.shipping_city,
    order?.shipping_state,
    order?.shipping_postal_code,
    order?.shipping_country,
  ]
    .map(x => String(x ?? '').trim())
    .filter(Boolean)
  return parts.join(', ') || '–'
}

function formatDiscount(value: unknown) {
  const n = Number(value ?? 0)
  if (!n)
    return '-'
  return formatPrice(n)
}

async function load() {
  loading.value = true
  try {
    const currentSort = sortBy.value[0] ?? { key: 'created_at', order: 'desc' as const }
    const data = await $fetch<any>('/api/admin/orders', {
      query: {
        q: search.value.trim() || undefined,
        status: statusFilter.value || undefined,
        page: page.value,
        per_page: perPage.value,
        sort_by: currentSort.key,
        sort_order: currentSort.order,
      },
    })
    orders.value = data?.items ?? []
    total.value = Number(data?.total ?? 0)
    selectedOrderIds.value = []
  }
  finally {
    loading.value = false
  }
}

async function applyBulkStatus() {
  if (!selectedOrderIds.value.length || !bulkStatus.value)
    return
  bulkSaving.value = true
  try {
    const start = estimateRange.value.start
    const end = estimateRange.value.end
    await Promise.all(
      selectedOrderIds.value.map(id =>
        $fetch(`/api/admin/orders/${id}/status`, {
          method: 'PUT',
          body: {
            status: bulkStatus.value,
            estimate_delivery_start: bulkStatus.value === 'shipped' ? start : null,
            estimate_delivery_end: bulkStatus.value === 'shipped' ? end : null,
          },
        }),
      ),
    )
    showBulkStatusDialog.value = false
    bulkStatus.value = ''
    estimateRange.value = { start: null, end: null }
    await load()
  }
  finally {
    bulkSaving.value = false
  }
}

function openDeleteDialog(order: any) {
  if (!canDeleteOrders.value)
    return
  selectedOrder.value = order
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedOrder.value?.id)
    return
  deletingId.value = selectedOrder.value.id
  try {
    await $fetch(`/api/admin/orders/${selectedOrder.value.id}`, { method: 'DELETE' })
    showDeleteDialog.value = false
    selectedOrder.value = null
    await load()
  }
  finally {
    deletingId.value = null
  }
}

watch(page, () => load())
watch(perPage, () => {
  page.value = 1
  load()
})
watch(sortBy, () => {
  page.value = 1
  load()
}, { deep: true })
watch(statusFilter, () => {
  page.value = 1
  load()
})
watch(search, () => {
  page.value = 1
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    load()
  }, 300)
})
watch(showBulkStatusDialog, (open) => {
  if (!open) {
    bulkStatus.value = ''
    estimateRange.value = { start: null, end: null }
  }
})

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  actorRole.value = profile?.role ?? null
  await load()
})
</script>

<style scoped>
.admin-orders-table :deep(th),
.admin-orders-table :deep(td) {
  white-space: nowrap;
}

.admin-orders-table :deep(th:nth-child(1)),
.admin-orders-table :deep(td:nth-child(1)) { min-width: 56px; }
.admin-orders-table :deep(th:nth-child(2)),
.admin-orders-table :deep(td:nth-child(2)) { min-width: 160px; }
.admin-orders-table :deep(th:nth-child(3)),
.admin-orders-table :deep(td:nth-child(3)) { min-width: 130px; }
.admin-orders-table :deep(th:nth-child(4)),
.admin-orders-table :deep(td:nth-child(4)) { min-width: 180px; }
.admin-orders-table :deep(th:nth-child(5)),
.admin-orders-table :deep(td:nth-child(5)) { min-width: 220px; }
.admin-orders-table :deep(th:nth-child(6)),
.admin-orders-table :deep(td:nth-child(6)) { min-width: 300px; }
.admin-orders-table :deep(th:nth-child(7)),
.admin-orders-table :deep(td:nth-child(7)) { min-width: 130px; }
.admin-orders-table :deep(th:nth-child(8)),
.admin-orders-table :deep(td:nth-child(8)) { min-width: 140px; }
.admin-orders-table :deep(th:nth-child(9)),
.admin-orders-table :deep(td:nth-child(9)) { min-width: 150px; }
.admin-orders-table :deep(th:nth-child(10)),
.admin-orders-table :deep(td:nth-child(10)) { min-width: 170px; }
.admin-orders-table :deep(th:nth-child(11)),
.admin-orders-table :deep(td:nth-child(11)) { min-width: 170px; }
.admin-orders-table :deep(th:nth-child(12)),
.admin-orders-table :deep(td:nth-child(12)) { min-width: 100px; }
</style>
