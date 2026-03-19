<template>
  <div>
    <h1 class="text-h4 mb-4">
      Products
    </h1>
    <v-btn v-if="canEditProducts" color="primary" class="mb-4" :to="'/admin/products/new'">
      Add product
    </v-btn>
    <AppDataTableToolbar card-class="mb-3">
      <template #filters>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="search"
              label="Search products"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              prepend-inner-icon="mdi-magnify"
              class="app-filter-field"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="selectedBrandId"
              :items="brands"
              item-title="name"
              item-value="id"
              label="Brand model"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="app-filter-field"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="selectedCategoryIds"
              :items="categories"
              item-title="name"
              item-value="id"
              label="Categories"
              variant="outlined"
              density="compact"
              hide-details
              multiple
              chips
              clearable
              class="app-filter-field"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="selectedTagIds"
              :items="tags"
              item-title="name"
              item-value="id"
              label="Tags"
              variant="outlined"
              density="compact"
              hide-details
              multiple
              chips
              clearable
              class="app-filter-field"
            />
          </v-col>
      </template>
      <template #actions>
        <template v-if="canDeleteProducts && selectedProductIds.length > 0">
            <v-col cols="12" sm="6" md="3">
              <v-chip size="small" variant="outlined">
                Selected: {{ selectedProductIds.length }}
              </v-chip>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-btn
                block
                size="small"
                variant="outlined"
                :disabled="selectedProductIds.length === 0 || bulkWorking"
                :loading="bulkWorking && bulkAction === 'activate'"
                @click="bulkUpdateStatus(true)"
              >
                Set active
              </v-btn>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-btn
                block
                size="small"
                variant="outlined"
                :disabled="selectedProductIds.length === 0 || bulkWorking"
                :loading="bulkWorking && bulkAction === 'deactivate'"
                @click="bulkUpdateStatus(false)"
              >
                Set inactive
              </v-btn>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-btn
                block
                size="small"
                color="error"
                variant="outlined"
                :disabled="selectedProductIds.length === 0 || bulkWorking"
                @click="showBulkDeleteDialog = true"
              >
                Delete selected
              </v-btn>
            </v-col>
        </template>
        </template>
    </AppDataTableToolbar>
    <div class="admin-products-table-wrap">
      <v-data-table-server
        v-model="selectedRows"
        v-model:page="page"
        v-model:items-per-page="perPage"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="products"
        :items-length="total"
        :items-per-page-options="perPageOptions"
        :loading="loading"
        show-select
        return-object
        class="elevation-0 admin-products-table"
      >
        <template #item.name="{ item }">
          <NuxtLink :to="`/admin/products/${unwrapRow(item).id}`" class="text-primary text-decoration-none font-weight-medium">
            {{ unwrapRow(item).name }}
          </NuxtLink>
        </template>
        <template #item.barcode="{ item }">
          <BarcodeImage :value="unwrapRow(item).barcode" />
        </template>
        <template #item.variant_count="{ item }">
          <v-btn
            size="small"
            variant="text"
            class="text-none px-1 count-cell-btn"
            :disabled="Number(unwrapRow(item).variant_count ?? 0) <= 0"
            @click.stop="openVariantDialog(unwrapRow(item))"
          >
            <span class="count-cell-text">{{ unwrapRow(item).variant_count ?? 0 }}</span>
          </v-btn>
        </template>
        <template #item.image_count="{ item }">
          <span class="count-cell-text">{{ unwrapRow(item).image_count ?? 0 }}</span>
        </template>
        <template #item.price="{ item }">
          {{ formatPriceDisplay(unwrapRow(item)) }}
        </template>
        <template #item.is_active="{ item }">
          {{ unwrapRow(item).is_active ? 'Yes' : 'No' }}
        </template>
        <template #item.created_at="{ item }">
          {{ formatTimestamp(unwrapRow(item).created_at) }}
        </template>
        <template #item.updated_at="{ item }">
          {{ formatTimestamp(unwrapRow(item).updated_at) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn
            v-if="canEditProducts"
            icon="mdi-pencil"
            size="small"
            variant="text"
            :to="`/admin/products/${unwrapRow(item).id}`"
          />
          <v-btn
            v-if="canDeleteProducts"
            icon="mdi-trash-can"
            size="small"
            variant="text"
            color="error"
            :disabled="!unwrapRow(item).is_active"
            :loading="deletingId === unwrapRow(item).id"
            @click="openDeleteDialog(unwrapRow(item))"
          </v-btn>
        </template>
      </v-data-table-server>
    </div>

    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm product deletion</v-card-title>
        <v-card-text>
          This is a soft delete and will set the product to inactive.
          <strong v-if="selectedProduct"> {{ selectedProduct.name }}</strong>
          will no longer appear in active catalog listings.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deletingId !== null" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deletingId === selectedProduct?.id"
            :disabled="!selectedProduct"
            @click="confirmDelete"
          >
            Confirm delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showBulkDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm bulk product deletion</v-card-title>
        <v-card-text>
          This is a soft delete and will set {{ selectedProductIds.length }} selected product(s) to inactive.
          They will no longer appear in active catalog listings.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="bulkWorking" @click="showBulkDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="bulkWorking && bulkAction === 'delete'"
            :disabled="selectedProductIds.length === 0"
            @click="confirmBulkDelete"
          >
            Confirm delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showVariantDialog" max-width="820">
      <v-card>
        <v-card-title>
          Variants
          <span v-if="variantDialogProductName" class="text-medium-emphasis"> - {{ variantDialogProductName }}</span>
        </v-card-title>
        <v-card-text>
          <div v-if="variantDialogLoading" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate />
          </div>
          <div v-else-if="!variantDialogRows.length" class="text-medium-emphasis">
            No variants with price greater than 0.
          </div>
          <v-table v-else>
            <thead>
              <tr>
                <th>Variant</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in variantDialogRows" :key="row.id">
                <td>{{ row.label }}</td>
                <td>{{ formatPrice(row.price) }}</td>
                <td>{{ row.trackStock ? row.stock : '-' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showVariantDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const products = ref<any[]>([])
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const showVariantDialog = ref(false)
const selectedProduct = ref<any | null>(null)
const deletingId = ref<string | null>(null)
const variantDialogLoading = ref(false)
const variantDialogProductName = ref('')
const variantDialogRows = ref<Array<{ id: string; label: string; price: number; trackStock: boolean; stock: number | string }>>([])
const selectedRows = ref<any[]>([])
const bulkWorking = ref(false)
const bulkAction = ref<'activate' | 'deactivate' | 'delete' | null>(null)
const role = ref<'superadmin' | 'admin' | 'staff' | 'member' | null>(null)
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const perPageOptions = [25, 50, 100]
const sortBy = ref<Array<{ key: string, order: 'asc' | 'desc' }>>([{ key: 'created_at', order: 'desc' }])
const brands = ref<any[]>([])
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const selectedBrandId = ref<string | null>(null)
const selectedCategoryIds = ref<string[]>([])
const selectedTagIds = ref<string[]>([])
const loading = ref(false)
const total = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const { formatPrice } = usePricingFormat()
const canEditProducts = computed(() => role.value === 'superadmin' || role.value === 'admin' || role.value === 'staff')
const canDeleteProducts = computed(() => role.value === 'superadmin' || role.value === 'admin')
const selectedProductIds = computed(() =>
  selectedRows.value
    .map(row => unwrapRow(row)?.id)
    .filter((id): id is string => Boolean(id)),
)
const headers = [
  { title: 'Name', key: 'name', sortable: true, width: '260px' },
  { title: 'Barcode', key: 'barcode', sortable: false, width: '200px' },
  { title: 'Variants', key: 'variant_count', sortable: false, width: '100px' },
  { title: 'Images', key: 'image_count', sortable: false, width: '100px' },
  { title: 'Price', key: 'price', sortable: false, width: '170px' },
  { title: 'Status', key: 'is_active', sortable: true, width: '100px' },
  { title: 'Created', key: 'created_at', sortable: true, width: '150px' },
  { title: 'Updated', key: 'updated_at', sortable: true, width: '150px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '110px' },
]

function unwrapRow(item: any) {
  return item?.raw ?? item
}

function formatTimestamp(value: string | null | undefined) {
  if (!value)
    return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
  const year = String(date.getFullYear())
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`
}

function formatPriceDisplay(row: any) {
  const min = Number(row?.price_min)
  const max = Number(row?.price_max)
  const hasMin = !Number.isNaN(min)
  const hasMax = !Number.isNaN(max)
  if (!hasMin && !hasMax)
    return '-'
  if (row?.has_variants) {
    if (hasMin && hasMax)
      return `${formatPrice(min)} - ${formatPrice(max)}`
    const fallback = hasMin ? min : max
    return formatPrice(fallback)
  }
  const single = hasMin ? min : max
  return formatPrice(single)
}

function variantLabel(variant: any) {
  const optionValues = variant?.option_values && typeof variant.option_values === 'object'
    ? Object.entries(variant.option_values)
      .map(([k, v]) => `${k}: ${String(v ?? '').trim()}`)
      .filter(Boolean)
      .join(', ')
    : ''
  const name = String(variant?.name ?? '').trim()
  if (name && optionValues)
    return `${name} (${optionValues})`
  return name || optionValues || 'Variant'
}

async function openVariantDialog(productRow: any) {
  const productId = String(productRow?.id ?? '')
  if (!productId)
    return

  showVariantDialog.value = true
  variantDialogLoading.value = true
  variantDialogProductName.value = String(productRow?.name ?? '')
  variantDialogRows.value = []
  try {
    const detail = await $fetch<any>(`/api/admin/products/${productId}`)
    const rows = Array.isArray(detail?.variants) ? detail.variants : []
    variantDialogRows.value = rows
      .map((v: any) => ({
        id: String(v?.id ?? ''),
        label: variantLabel(v),
        price: Number(v?.price),
        trackStock: v?.track_stock !== false,
        stock: Number.isNaN(Number(v?.stock)) ? '-' : Number(v?.stock),
      }))
      .filter((v: { id: string, price: number }) => v.id && !Number.isNaN(v.price) && v.price > 0)
  }
  finally {
    variantDialogLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const currentSort = Array.isArray(sortBy.value) && sortBy.value.length > 0 ? sortBy.value[0] : { key: 'created_at', order: 'desc' as const }
    const data = await $fetch<any>('/api/admin/products', {
      query: {
        q: search.value.trim() || undefined,
        brand_id: selectedBrandId.value || undefined,
        category_ids: selectedCategoryIds.value.length ? selectedCategoryIds.value.join(',') : undefined,
        tag_ids: selectedTagIds.value.length ? selectedTagIds.value.join(',') : undefined,
        sort_by: currentSort.key,
        sort_order: currentSort.order,
        page: page.value,
        per_page: perPage.value,
      },
    })
    products.value = data?.items ?? []
    total.value = Number(data?.total ?? 0)
    selectedRows.value = []
  }
  finally {
    loading.value = false
  }
}

async function loadFilters() {
  const data = await $fetch<any>('/api/admin/product-metadata')
  brands.value = data?.brands ?? []
  categories.value = data?.categories ?? []
  tags.value = data?.tags ?? []
}

function openDeleteDialog(product: any) {
  selectedProduct.value = product
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedProduct.value?.id)
    return

  deletingId.value = selectedProduct.value.id
  try {
    await $fetch(`/api/admin/products/${selectedProduct.value.id}`, { method: 'DELETE' })
    showDeleteDialog.value = false
    selectedProduct.value = null
    await load()
  }
  finally {
    deletingId.value = null
  }
}

async function bulkUpdateStatus(isActive: boolean) {
  if (!selectedProductIds.value.length)
    return

  bulkWorking.value = true
  bulkAction.value = isActive ? 'activate' : 'deactivate'
  try {
    await Promise.all(
      selectedProductIds.value.map(id =>
        $fetch(`/api/admin/products/${id}`, { method: 'PUT', body: { is_active: isActive } }),
      ),
    )
    await load()
  }
  finally {
    bulkWorking.value = false
    bulkAction.value = null
  }
}

async function confirmBulkDelete() {
  if (!selectedProductIds.value.length)
    return

  bulkWorking.value = true
  bulkAction.value = 'delete'
  try {
    await Promise.all(
      selectedProductIds.value.map(id =>
        $fetch(`/api/admin/products/${id}`, { method: 'DELETE' }),
      ),
    )
    showBulkDeleteDialog.value = false
    await load()
  }
  finally {
    bulkWorking.value = false
    bulkAction.value = null
  }
}

onMounted(load)

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  role.value = profile?.role ?? null
  await loadFilters()
})

watch(page, () => {
  load()
})

watch(perPage, () => {
  page.value = 1
  load()
})

watch(search, () => {
  page.value = 1
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    load()
  }, 250)
})

watch(selectedCategoryIds, () => {
  page.value = 1
  load()
}, { deep: true })

watch(selectedBrandId, () => {
  page.value = 1
  load()
})

watch(selectedTagIds, () => {
  page.value = 1
  load()
}, { deep: true })

watch(sortBy, () => {
  page.value = 1
  load()
}, { deep: true })

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})
</script>

<style scoped>
.admin-products-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.admin-products-table :deep(th),
.admin-products-table :deep(td) {
  white-space: nowrap;
}

.admin-products-table :deep(th:nth-child(1)),
.admin-products-table :deep(td:nth-child(1)) {
  min-width: 56px;
}

.admin-products-table :deep(th:nth-child(2)),
.admin-products-table :deep(td:nth-child(2)) {
  min-width: 260px;
}

.admin-products-table :deep(th:nth-child(3)),
.admin-products-table :deep(td:nth-child(3)) {
  min-width: 200px;
}

.admin-products-table :deep(th:nth-child(4)),
.admin-products-table :deep(td:nth-child(4)),
.admin-products-table :deep(th:nth-child(5)),
.admin-products-table :deep(td:nth-child(5)) {
  min-width: 100px;
}

.admin-products-table :deep(th:nth-child(6)),
.admin-products-table :deep(td:nth-child(6)) {
  min-width: 170px;
}

.admin-products-table :deep(th:nth-child(7)),
.admin-products-table :deep(td:nth-child(7)) {
  min-width: 100px;
}

.admin-products-table :deep(th:nth-child(8)),
.admin-products-table :deep(td:nth-child(8)),
.admin-products-table :deep(th:nth-child(9)),
.admin-products-table :deep(td:nth-child(9)) {
  min-width: 150px;
}

.admin-products-table :deep(th:nth-child(10)),
.admin-products-table :deep(td:nth-child(10)) {
  min-width: 110px;
}

.count-cell-text {
  font-size: 0.875rem;
}

.count-cell-btn :deep(.v-btn__content) {
  font-size: 0.875rem;
}
</style>
