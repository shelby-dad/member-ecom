<template>
  <div>
    <h1 class="text-h4 mb-4">
      Orders
    </h1>

    <AppDataTableToolbar card-class="mb-3">
      <template #filters>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="search"
              label="Search"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              prepend-inner-icon="mdi-magnify"
              class="app-filter-field"
              @click:clear="onSearchClear"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
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
              class="app-filter-field"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <DateRangePickerField
              v-model="orderDateRange"
              label="Order Date"
              max-width="100%"
              value-format="iso"
              :emit-on-close="true"
              class="app-filter-field"
            />
          </v-col>
      </template>
      <template #actions>
          <v-col v-if="selectedOrderIds.length > 0" cols="12" sm="6" md="4">
            <v-btn
              block
              size="small"
              variant="outlined"
              color="primary"
              @click="showBulkStatusDialog = true"
            >
              <v-badge :content="selectedOrderIds.length" color="primary" inline>
                <span>Update Status</span>
              </v-badge>
            </v-btn>
          </v-col>
          <v-col v-if="selectedOrderIds.length > 0" cols="12" sm="6" md="4">
            <v-btn
              block
              size="small"
              variant="outlined"
              color="success"
              :loading="exportingXls"
              @click="downloadSelectedXls"
            >
              <v-badge :content="selectedOrderIds.length" color="success" inline>
                <span>Download XLS</span>
              </v-badge>
            </v-btn>
          </v-col>
      </template>
    </AppDataTableToolbar>

    <v-card v-if="initialLoading" class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="table-heading" class="mb-2" />
        <v-skeleton-loader
          v-for="n in 8"
          :key="`admin-orders-skeleton-${n}`"
          type="table-row-divider"
          class="mb-1"
        />
      </v-card-text>
    </v-card>

    <v-data-table-server
      v-else
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
      <template #item.source="{ item }">
        {{ item.source || '-' }}
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
              :emit-on-close="true"
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
const initialLoading = ref(true)
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const perPageOptions = [25, 50, 100]
const sortBy = ref<Array<{ key: string, order: 'asc' | 'desc' }>>([{ key: 'created_at', order: 'desc' }])
const selectedOrderIds = ref<string[]>([])
const search = ref<string | null>('')
const statusFilter = ref<string | null>(null)
const orderDateRange = ref<{ start: string | null, end: string | null }>({ start: null, end: null })
const showBulkStatusDialog = ref(false)
const bulkStatus = ref<string>('')
const estimateRange = ref<{ start: string | null, end: string | null }>({ start: null, end: null })
const bulkSaving = ref(false)
const showDeleteDialog = ref(false)
const selectedOrder = ref<any | null>(null)
const deletingId = ref<string | null>(null)
const exportingXls = ref(false)
const actorRole = ref<'superadmin' | 'admin' | 'staff' | 'member' | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
const normalizedSearch = computed(() => String(search.value ?? '').trim())

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
  { title: 'Source', key: 'source', sortable: false, width: '140px' },
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
        q: normalizedSearch.value || undefined,
        status: statusFilter.value || undefined,
        created_from: orderDateRange.value.start || undefined,
        created_to: orderDateRange.value.end || undefined,
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
    initialLoading.value = false
  }
}

function onSearchClear() {
  if (searchTimer)
    clearTimeout(searchTimer)
  page.value = 1
  load()
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

async function downloadSelectedXls() {
  if (!selectedOrderIds.value.length || exportingXls.value)
    return
  exportingXls.value = true
  try {
    const blob = await $fetch<Blob>('/api/admin/orders/export-xls', {
      method: 'POST',
      body: { order_ids: selectedOrderIds.value },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    link.href = url
    link.download = `orders-${stamp}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
  finally {
    exportingXls.value = false
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
watch(orderDateRange, () => {
  page.value = 1
  load()
}, { deep: true })
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
.admin-orders-table :deep(td:nth-child(4)) { min-width: 140px; }
.admin-orders-table :deep(th:nth-child(5)),
.admin-orders-table :deep(td:nth-child(5)) { min-width: 180px; }
.admin-orders-table :deep(th:nth-child(6)),
.admin-orders-table :deep(td:nth-child(6)) { min-width: 220px; }
.admin-orders-table :deep(th:nth-child(7)),
.admin-orders-table :deep(td:nth-child(7)) { min-width: 300px; }
.admin-orders-table :deep(th:nth-child(8)),
.admin-orders-table :deep(td:nth-child(8)) { min-width: 130px; }
.admin-orders-table :deep(th:nth-child(9)),
.admin-orders-table :deep(td:nth-child(9)) { min-width: 140px; }
.admin-orders-table :deep(th:nth-child(10)),
.admin-orders-table :deep(td:nth-child(10)) { min-width: 150px; }
.admin-orders-table :deep(th:nth-child(11)),
.admin-orders-table :deep(td:nth-child(11)) { min-width: 170px; }
.admin-orders-table :deep(th:nth-child(12)),
.admin-orders-table :deep(td:nth-child(12)) { min-width: 170px; }
.admin-orders-table :deep(th:nth-child(13)),
.admin-orders-table :deep(td:nth-child(13)) { min-width: 100px; }
</style>
