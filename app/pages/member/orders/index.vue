<template>
  <div>
    <h1 class="text-h4 mb-4">
      My orders
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
            v-model="dateRange"
            label="Date range"
            max-width="100%"
            value-format="ymd"
            :emit-on-close="true"
            class="app-filter-field"
          />
        </v-col>
      </template>
    </AppDataTableToolbar>

    <v-card v-if="loading && !orders.length" class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="table-heading" class="mb-2" />
        <v-skeleton-loader
          v-for="n in 6"
          :key="`order-row-skeleton-${n}`"
          type="table-row-divider"
          class="mb-1"
        />
      </v-card-text>
    </v-card>

    <v-data-table-server
      v-else
      v-model:page="page"
      v-model:items-per-page="perPage"
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="orders"
      :items-length="total"
      :items-per-page-options="perPageOptions"
      :loading="loading"
      item-value="id"
      class="elevation-0 member-orders-table"
    >
      <template #item.order_number="{ item }">
        <NuxtLink :to="`/member/orders/${item.id}`" class="text-primary text-decoration-none font-weight-medium">
          {{ item.order_number }}
        </NuxtLink>
      </template>
      <template #item.status="{ item }">
        <v-chip size="small">{{ item.status }}</v-chip>
      </template>
      <template #item.payment_method_type="{ item }">
        {{ formatPaymentMethod(item.payment_method_type) }}
      </template>
      <template #item.payment_status="{ item }">
        {{ formatTextOrDash(item.payment_status) }}
      </template>
      <template #item.estimate_delivery="{ item }">
        {{ formatEstimateRange(item.estimate_delivery_start, item.estimate_delivery_end) }}
      </template>
      <template #item.total="{ item }">
        {{ formatPrice(item.total) }}
      </template>
      <template #item.discount_total="{ item }">
        {{ formatDiscount(item.discount_total) }}
      </template>
      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" :to="`/member/orders/${item.id}`">
          View
        </v-btn>
      </template>
    </v-data-table-server>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
setPageLayout('member')
const { formatPrice } = usePricingFormat()

const orders = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const perPageOptions = [10, 25, 50, 100]
const sortBy = ref<Array<{ key: string, order: 'asc' | 'desc' }>>([{ key: 'created_at', order: 'desc' }])
const search = ref<string | null>('')
const statusFilter = ref<string | null>(null)
const dateRange = ref<{ start: string | null, end: string | null }>({ start: null, end: null })
let searchTimer: ReturnType<typeof setTimeout> | null = null
const normalizedSearch = computed(() => String(search.value ?? '').trim())

const statusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Processing', value: 'processing' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' },
]

const headers = [
  { title: 'Order #', key: 'order_number', sortable: true, width: '170px' },
  { title: 'Status', key: 'status', sortable: true, width: '130px' },
  { title: 'Payment Method', key: 'payment_method_type', sortable: true, width: '170px' },
  { title: 'Payment Status', key: 'payment_status', sortable: true, width: '160px' },
  { title: 'Estimate Delivery', key: 'estimate_delivery', sortable: false, width: '200px' },
  { title: 'Total', key: 'total', sortable: true, width: '130px' },
  { title: 'Discount Amount', key: 'discount_total', sortable: true, width: '150px' },
  { title: 'Date', key: 'created_at', sortable: true, width: '190px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
]

function formatDate(d: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(d))
}

function formatTextOrDash(value: string | null | undefined) {
  return value ? value : '-'
}

function formatPaymentMethod(value: string | null | undefined) {
  if (!value) return '-'
  if (value === 'bank_transfer') return 'Bank Transfer'
  if (value === 'cod') return 'Cash on Delivery'
  if (value === 'wallet') return 'Wallet'
  return value
}

function formatEstimateRange(start: string | null | undefined, end: string | null | undefined) {
  const fmt = (v: string) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(v))
  if (start && end) return `${fmt(start)} - ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return '-'
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
    const data = await $fetch<any>('/api/member/orders', {
      query: {
        q: normalizedSearch.value || undefined,
        status: statusFilter.value || undefined,
        date_from: dateRange.value.start || undefined,
        date_to: dateRange.value.end || undefined,
        page: page.value,
        per_page: perPage.value,
        sort_by: currentSort.key,
        sort_order: currentSort.order,
      },
    })
    orders.value = data?.items ?? []
    total.value = Number(data?.total ?? 0)
  }
  finally {
    loading.value = false
  }
}

function onSearchClear() {
  if (searchTimer)
    clearTimeout(searchTimer)
  page.value = 1
  load()
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
watch(dateRange, () => {
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

onMounted(load)
</script>

<style scoped>
.member-orders-table :deep(th),
.member-orders-table :deep(td) {
  white-space: nowrap;
}

.member-orders-table :deep(th:nth-child(1)),
.member-orders-table :deep(td:nth-child(1)) {
  min-width: 170px;
}

.member-orders-table :deep(th:nth-child(2)),
.member-orders-table :deep(td:nth-child(2)) {
  min-width: 130px;
}

.member-orders-table :deep(th:nth-child(3)),
.member-orders-table :deep(td:nth-child(3)) {
  min-width: 170px;
}

.member-orders-table :deep(th:nth-child(4)),
.member-orders-table :deep(td:nth-child(4)) {
  min-width: 160px;
}

.member-orders-table :deep(th:nth-child(5)),
.member-orders-table :deep(td:nth-child(5)) {
  min-width: 200px;
}

.member-orders-table :deep(th:nth-child(6)),
.member-orders-table :deep(td:nth-child(6)) {
  min-width: 130px;
}

.member-orders-table :deep(th:nth-child(7)),
.member-orders-table :deep(td:nth-child(7)) {
  min-width: 150px;
}

.member-orders-table :deep(th:nth-child(8)),
.member-orders-table :deep(td:nth-child(8)) {
  min-width: 190px;
}

.member-orders-table :deep(th:nth-child(9)),
.member-orders-table :deep(td:nth-child(9)) {
  min-width: 100px;
}
</style>
