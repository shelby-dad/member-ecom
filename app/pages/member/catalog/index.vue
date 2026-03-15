<template>
  <div>
    <h1 class="text-h4 mb-4">
      Catalog
    </h1>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.q"
              label="Search"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="filters.brand_id"
              :items="brands"
              item-title="name"
              item-value="id"
              label="Brand model"
              variant="outlined"
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="filters.sort"
              :items="sortItems"
              item-title="label"
              item-value="value"
              label="Sort"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="filters.category_ids"
              :items="categoryOptions"
              item-title="name"
              item-value="id"
              label="Categories"
              variant="outlined"
              density="compact"
              multiple
              chips
              clearable
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="filters.tag_ids"
              :items="tags"
              item-title="name"
              item-value="id"
              label="Tags"
              variant="outlined"
              density="compact"
              multiple
              chips
              clearable
            />
          </v-col>
        </v-row>

        <div class="px-1">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-body-2 text-medium-emphasis">Price range</span>
            <span class="text-body-2 font-weight-medium">
              {{ formatPrice(filters.price_min) }} - {{ formatPrice(filters.price_max) }}
            </span>
          </div>
          <v-range-slider
            v-model="priceRange"
            :min="priceBounds.min"
            :max="priceBounds.max"
            :step="1"
            hide-details
            color="primary"
          />
        </div>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col v-for="p in products" :key="p.id" cols="12" sm="6" lg="4">
        <v-card class="app-card h-100" hover @click="goProduct(p.id)">
          <div class="catalog-card-media">
            <v-img
              v-if="p.image_path"
              :src="imageUrl(p.image_path)"
              class="catalog-card-image"
              contain
            />
            <div v-else class="catalog-image-placeholder">
              <v-icon size="28" class="mb-1">mdi-image-off-outline</v-icon>
              <span>No product image</span>
            </div>
          </div>
          <v-card-title>{{ p.name }}</v-card-title>
          <v-card-subtitle class="pt-0">
            {{ formatPrice(p.min_price) }}
          </v-card-subtitle>
          <v-card-text>
            {{ p.description || 'No description' }}
          </v-card-text>
          <v-card-actions>
            <v-btn variant="flat" color="primary" size="small" @click.stop="goProduct(p.id)">
              View
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              size="small"
              class="catalog-cart-btn"
              :loading="quickCartLoadingId === p.id"
              @click.stop="quickAddFromCatalog(p)"
            >
              <v-icon size="18">mdi-cart-plus</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="initialLoading" class="text-center py-8">
      <v-progress-circular indeterminate />
    </div>
    <p v-else-if="products.length === 0" class="text-medium-emphasis">
      No products matched your filters.
    </p>

    <div ref="sentinel" class="catalog-sentinel" />
    <div v-if="loadingMore && !initialLoading" class="text-center py-3">
      <v-progress-circular size="22" indeterminate />
    </div>

    <v-dialog v-model="showVariantDialog" max-width="640" persistent>
      <v-card>
        <v-card-title>Select variant</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <div class="variant-visual-panel">
                <template v-if="selectedVariantVisual?.type === 'image'">
                  <v-img
                    :src="imageUrl(selectedVariantVisual.value)"
                    class="variant-visual-image"
                    cover
                  />
                </template>
                <template v-else-if="selectedVariantVisual?.type === 'color'">
                  <div class="variant-visual-color" :style="{ backgroundColor: selectedVariantVisual.value }" />
                </template>
                <template v-else>
                  <div class="variant-visual-empty">
                    <v-icon size="26">mdi-palette-outline</v-icon>
                    <span>No visual option</span>
                  </div>
                </template>
              </div>
              <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
                {{ selectedVariantVisualLabel }}
              </p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-body-2 text-medium-emphasis mb-3">
                {{ variantModalProductName }}
              </p>
              <v-radio-group v-model="selectedVariantId">
                <v-radio
                  v-for="v in modalVariants"
                  :key="v.id"
                  :value="v.id"
                  :disabled="v.track_stock && v.available_stock <= 0"
                >
                  <template #label>
                    <div class="w-100 d-flex align-center justify-space-between ga-2">
                      <span>{{ v.name }}</span>
                      <span class="text-medium-emphasis">{{ formatPrice(v.price) }}</span>
                      <span v-if="v.track_stock" class="text-caption text-medium-emphasis">
                        {{ `Stock: ${v.available_stock}` }}
                      </span>
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>
              <div class="d-flex align-center ga-2 mt-2">
                <span class="text-body-2">Qty</span>
                <v-btn icon size="small" variant="outlined" :disabled="selectedQty <= 1" @click="selectedQty--">
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <strong style="min-width: 28px; text-align: center">{{ selectedQty }}</strong>
                <v-btn icon size="small" variant="outlined" :disabled="!canIncreaseSelectedQty" @click="selectedQty++">
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showVariantDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!selectedVariantForModal" @click="addSelectedVariantToCart">
            Add to cart
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack" :color="snackSuccess ? 'success' : 'error'" :timeout="2200">
      {{ snackMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const config = useRuntimeConfig()
const supabase = useSupabaseClient()
const cart = useCart()
const products = ref<any[]>([])
const brands = ref<any[]>([])
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const priceBounds = reactive({ min: 0, max: 0 })
const loadingMore = ref(false)
const initialLoading = ref(true)
const hasMore = ref(true)
const page = ref(1)
const perPage = 12
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let filterTimer: ReturnType<typeof setTimeout> | null = null
const quickCartLoadingId = ref<string | null>(null)
const showVariantDialog = ref(false)
const variantModalProductName = ref('')
const modalOptionSets = ref<any[]>([])
const modalVariants = ref<Array<{ id: string; name: string; price: number; track_stock: boolean; available_stock: number; option_values: Record<string, string> | null }>>([])
const selectedVariantId = ref<string>('')
const selectedQty = ref(1)
const snack = ref(false)
const snackSuccess = ref(true)
const snackMsg = ref('')

const filters = reactive({
  q: '',
  brand_id: null as string | null,
  category_ids: [] as string[],
  tag_ids: [] as string[],
  sort: 'relevance' as 'relevance' | 'price_asc' | 'price_desc',
  price_min: 0,
  price_max: 0,
})

const sortItems = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
]

const categoryOptions = computed(() => {
  const byParent: Record<string, any[]> = {}
  for (const c of categories.value) {
    const key = c.parent_id || 'root'
    byParent[key] = byParent[key] || []
    byParent[key].push(c)
  }
  for (const bucket of Object.values(byParent))
    bucket.sort((a, b) => a.name.localeCompare(b.name))

  const out: Array<{ id: string; name: string }> = []
  function visit(node: any, depth: number) {
    out.push({ id: node.id, name: `${'  '.repeat(depth)}${node.name}` })
    for (const child of byParent[node.id] || [])
      visit(child, depth + 1)
  }
  for (const root of byParent.root || [])
    visit(root, 0)
  return out
})

const priceRange = computed<[number, number]>({
  get() {
    return [filters.price_min, filters.price_max]
  },
  set(value) {
    filters.price_min = value[0]
    filters.price_max = value[1]
  },
})

function imageUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function goProduct(id: string) {
  navigateTo(`/member/catalog/${id}`)
}

const selectedVariantForModal = computed(() =>
  modalVariants.value.find(v => v.id === selectedVariantId.value) ?? null,
)

const selectedVariantVisual = computed(() => {
  const variant = selectedVariantForModal.value
  if (!variant) return null
  const optionValues = variant.option_values ?? {}
  const sets = Array.isArray(modalOptionSets.value) ? modalOptionSets.value : []
  for (const set of sets) {
    const type = (set?.type ?? 'text') as 'text' | 'image' | 'color'
    if (type === 'text') continue
    const optionName = String(set?.name ?? '').trim()
    if (!optionName) continue
    const selectedLabel = String(optionValues[optionName] ?? '').trim()
    if (!selectedLabel) continue
    const values = Array.isArray(set?.values) ? set.values : []
    const normalized = values
      .map((raw: any) => {
        if (typeof raw === 'string') {
          const clean = raw.trim()
          return clean ? { label: clean, value: clean } : null
        }
        const label = String(raw?.label ?? '').trim()
        const value = String(raw?.value ?? '').trim()
        return label && value ? { label, value } : null
      })
      .filter(Boolean) as Array<{ label: string; value: string }>
    const hit = normalized.find(v => v.label === selectedLabel || v.value === selectedLabel)
    if (!hit) continue
    return {
      type,
      option_name: optionName,
      label: hit.label,
      value: hit.value,
    }
  }
  return null
})

const selectedVariantVisualLabel = computed(() => {
  const visual = selectedVariantVisual.value
  if (!visual) return 'Select a variant to preview color/image.'
  return `${visual.option_name}: ${visual.label}`
})

const canIncreaseSelectedQty = computed(() => {
  const variant = selectedVariantForModal.value
  if (!variant) return false
  if (!variant.track_stock) return true
  const inCart = cart.items.value.find(i => i.variant_id === variant.id)?.quantity ?? 0
  return selectedQty.value + inCart < variant.available_stock
})

function showSnack(message: string, success: boolean) {
  snackMsg.value = message
  snackSuccess.value = success
  snack.value = true
}

async function getProductVariantData(productId: string) {
  const [{ data: product, error: productError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from('products').select('id, name, has_variants, track_stock, option_sets').eq('id', productId).eq('is_active', true).single(),
    supabase.from('product_variants').select('id, name, price, track_stock, option_values').eq('product_id', productId).order('sort_order'),
  ])
  if (productError || !product)
    throw new Error(productError?.message || 'Product not found')
  if (variantsError)
    throw new Error(variantsError.message)
  const productRow = product as { id: string; name: string; has_variants: boolean; track_stock: boolean | null; option_sets: any[] | null }

  const variantRows = (variants ?? []).map((v: any) => ({
    id: v.id as string,
    name: v.name as string,
    price: Number(v.price ?? 0),
    track_stock: (v.track_stock ?? productRow.track_stock ?? true) !== false,
    option_values: (v.option_values ?? null) as Record<string, string> | null,
  }))
  const filtered = productRow.has_variants
    ? variantRows.filter(v => v.price > 0)
    : variantRows
  const variantIds = filtered.map(v => v.id)
  const { data: stockRows, error: stockError } = variantIds.length
    ? await supabase.from('stock').select('variant_id, quantity').in('variant_id', variantIds).is('branch_id', null)
    : { data: [], error: null }
  if (stockError)
    throw new Error(stockError.message)

  const stockByVariant: Record<string, number> = {}
  for (const row of (stockRows as any[]) ?? [])
    stockByVariant[row.variant_id] = (stockByVariant[row.variant_id] ?? 0) + Number(row.quantity ?? 0)

  return {
    product: productRow,
    variants: filtered.map(v => ({
      ...v,
      available_stock: stockByVariant[v.id] ?? 0,
    })),
  }
}

async function quickAddFromCatalog(item: any) {
  quickCartLoadingId.value = item.id
  try {
    const data = await getProductVariantData(item.id)
    if (!data.variants.length) {
      showSnack('No purchasable variants for this product.', false)
      return
    }

    if (!data.product.has_variants) {
      const variant = data.variants[0]
      const inCart = cart.items.value.find(i => i.variant_id === variant.id)?.quantity ?? 0
      if (variant.track_stock && inCart >= variant.available_stock) {
        showSnack('Out of stock for this item.', false)
        return
      }
      cart.addItem({
        variant_id: variant.id,
        product_name: data.product.name,
        variant_name: variant.name,
        price: variant.price,
        quantity: 1,
      })
      showSnack('Added to cart.', true)
      return
    }

    variantModalProductName.value = data.product.name
    modalOptionSets.value = data.product.option_sets ?? []
    modalVariants.value = data.variants
    selectedVariantId.value = data.variants[0]?.id ?? ''
    selectedQty.value = 1
    showVariantDialog.value = true
  }
  catch (error: any) {
    showSnack(error?.message || 'Unable to add product.', false)
  }
  finally {
    quickCartLoadingId.value = null
  }
}

function addSelectedVariantToCart() {
  const variant = selectedVariantForModal.value
  if (!variant) return
  const inCart = cart.items.value.find(i => i.variant_id === variant.id)?.quantity ?? 0
  if (variant.track_stock && selectedQty.value + inCart > variant.available_stock) {
    showSnack('Quantity exceeds available stock.', false)
    return
  }
  cart.addItem({
    variant_id: variant.id,
    product_name: variantModalProductName.value,
    variant_name: variant.name,
    price: variant.price,
    quantity: selectedQty.value,
  })
  showVariantDialog.value = false
  showSnack('Added to cart.', true)
}

function buildQueryParams(targetPage: number) {
  return {
    page: targetPage,
    per_page: perPage,
    q: filters.q || undefined,
    brand_id: filters.brand_id || undefined,
    category_ids: filters.category_ids.length ? filters.category_ids.join(',') : undefined,
    tag_ids: filters.tag_ids.length ? filters.tag_ids.join(',') : undefined,
    price_min: filters.price_min,
    price_max: filters.price_max,
    sort: filters.sort,
  }
}

async function fetchProducts(reset = false) {
  if (loadingMore.value) return
  if (reset) {
    page.value = 1
    hasMore.value = true
    products.value = []
    initialLoading.value = true
  }
  if (!hasMore.value) return

  loadingMore.value = true
  try {
    const data = await $fetch<any>('/api/member/catalog', { query: buildQueryParams(page.value) })
    const incoming = data?.items ?? []
    products.value = [...products.value, ...incoming]
    hasMore.value = Boolean(data?.has_more)
    page.value += 1
  }
  finally {
    loadingMore.value = false
    initialLoading.value = false
  }
}

function onFilterChanged() {
  if (filterTimer)
    clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    fetchProducts(true)
  }, 250)
}

function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinel.value) return
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting))
      fetchProducts()
  }, { rootMargin: '300px 0px 300px 0px' })
  observer.observe(sentinel.value)
}

async function loadMeta() {
  const data = await $fetch<any>('/api/member/catalog/meta')
  brands.value = data?.brands ?? []
  categories.value = data?.categories ?? []
  tags.value = data?.tags ?? []
  const min = Number(data?.price_bounds?.min ?? 0)
  const max = Number(data?.price_bounds?.max ?? 0)
  priceBounds.min = min
  priceBounds.max = Math.max(min, max)
  filters.price_min = min
  filters.price_max = Math.max(min, max)
}

watch(
  () => [filters.q, filters.brand_id, filters.sort, filters.price_min, filters.price_max, filters.category_ids.join(','), filters.tag_ids.join(',')],
  onFilterChanged,
)

onMounted(async () => {
  await loadMeta()
  await fetchProducts(true)
  setupObserver()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (filterTimer) clearTimeout(filterTimer)
})
</script>

<style scoped>
.catalog-card-media {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.12);
  border-bottom: 1px solid rgba(148, 163, 184, 0.24);
}

.catalog-card-image {
  width: 100%;
  height: 100%;
}

.catalog-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(71, 85, 105, 0.9);
  font-size: 0.85rem;
}

.catalog-sentinel {
  height: 1px;
}

.catalog-cart-btn {
  background: #16a34a;
  color: #fff;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(22, 163, 74, 0.24);
}

.variant-visual-panel {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.08);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.variant-visual-image {
  width: 100%;
  height: 220px;
}

.variant-visual-color {
  width: 78%;
  height: 170px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.variant-visual-empty {
  color: rgba(71, 85, 105, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
}
</style>
