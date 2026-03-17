<template>
  <div v-if="product">
    <h1 class="text-h4 mb-4">
      {{ product.name }}
    </h1>
    <v-card class="mb-4">
      <v-card-title>Product details</v-card-title>
      <v-card-text>
        <div class="product-media-wrap mb-4">
          <div
            v-if="selectedImagePath"
            class="product-media-main"
            @mouseenter="isImageHovering = true"
            @mouseleave="isImageHovering = false"
            @mousemove="onImageHoverMove"
          >
            <v-img :src="imageUrl(selectedImagePath)" class="product-main-image" contain />
            <div v-if="isImageHovering" class="product-image-magnifier" :style="magnifierStyle" />
          </div>
          <div v-else class="catalog-image-placeholder product-media-main">
            <v-icon size="32" class="mb-1">mdi-image-off-outline</v-icon>
            <span>No product image</span>
          </div>
          <v-slide-group v-if="images.length > 1" class="mt-3" show-arrows>
            <v-slide-group-item
              v-for="(img, idx) in images"
              :key="img.id"
              v-slot="{ toggle }"
            >
              <button
                type="button"
                class="thumb-btn"
                :class="{ 'thumb-btn--active': idx === selectedImageIndex }"
                @click="() => { selectedImageIndex = idx; toggle() }"
              >
                <v-img :src="imageUrl(img.path)" width="92" height="52" cover class="rounded" />
              </button>
            </v-slide-group-item>
          </v-slide-group>
        </div>
        <div class="text-body-1 text-medium-emphasis product-description" v-html="renderDescription(product.description)" />
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Variants</v-card-title>
      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in variantsWithStock" :key="v.id">
            <td>{{ v.name }}</td>
            <td>{{ formatPrice(v.price) }}</td>
            <td>{{ stockLabel(v) }}</td>
            <td>
              <v-btn
                size="small"
                color="primary"
                :disabled="!canPurchase(v)"
                @click="addToCart(v)"
              >
                Add to cart
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <v-snackbar v-model="snack" :timeout="2000" color="success">
      Added to cart
    </v-snackbar>
  </div>
  <div v-else class="text-center py-8">
    <v-progress-circular indeterminate />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const route = useRoute()
const config = useRuntimeConfig()
const id = route.params.id as string
const supabase = useSupabaseClient()
const product = ref<any>(null)
const variants = ref<any[]>([])
const images = ref<any[]>([])
const stockByVariant = ref<Record<string, number>>({})
const snack = ref(false)
const cart = useCart()
const selectedImageIndex = ref(0)
const isImageHovering = ref(false)
const hoverX = ref(50)
const hoverY = ref(50)

const variantsWithStock = computed(() =>
  variants.value.map(v => ({ ...v, stock: stockByVariant.value[v.id] ?? null })),
)
const selectedImagePath = computed(() => images.value[selectedImageIndex.value]?.path ?? '')
const magnifierStyle = computed(() => ({
  backgroundImage: `url(${imageUrl(selectedImagePath.value)})`,
  backgroundPosition: `${hoverX.value}% ${hoverY.value}%`,
}))

function optionSetImagePaths(optionSets: any): string[] {
  const sets = Array.isArray(optionSets) ? optionSets : []
  const paths: string[] = []
  for (const set of sets) {
    if ((set?.type ?? 'text') !== 'image') continue
    const values = Array.isArray(set?.values) ? set.values : []
    for (const raw of values) {
      const path = typeof raw === 'string'
        ? raw.trim()
        : String(raw?.value ?? '').trim()
      if (path)
        paths.push(path)
    }
  }
  return [...new Set(paths)]
}

function imageUrl(path: string) {
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function renderDescription(value: string | null | undefined) {
  if (isRichTextEmpty(value))
    return '<p>No description</p>'
  return sanitizeRichText(value)
}

function addToCart(v: any) {
  if (!canPurchase(v)) return
  if (v.track_stock !== false) {
    const existingQty = cart.items.value.find(i => i.variant_id === v.id)?.quantity ?? 0
    if (existingQty >= (v.stock ?? 0))
      return
  }
  cart.addItem({
    variant_id: v.id,
    product_name: product.value!.name,
    variant_name: v.name,
    price: v.price,
    quantity: 1,
  })
  snack.value = true
}

function canPurchase(v: any) {
  if (v.track_stock === false) return true
  return (v.stock ?? 0) > 0
}

function stockLabel(v: any) {
  if (v.track_stock === false) return 'Not tracked'
  if (v.stock == null) return '–'
  return v.stock > 0 ? `In stock (${v.stock})` : 'Out of stock'
}

function onImageHoverMove(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  if (!target) return
  const rect = target.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  hoverX.value = Math.max(0, Math.min(100, x))
  hoverY.value = Math.max(0, Math.min(100, y))
}

async function load() {
  const { data: p } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).single()
  const currentProduct = (p as any) ?? null
  product.value = currentProduct
  if (currentProduct) {
    const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order')
    const allVariants = v ?? []
    variants.value = currentProduct.has_variants
      ? allVariants.filter((row: any) => Number(row.price ?? 0) > 0)
      : allVariants
    const variantIds = variants.value.map((x: any) => x.id)
    const [{ data: imgs }, { data: stockRows }] = await Promise.all([
      supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
      variantIds.length
        ? supabase.from('stock').select('variant_id, quantity').in('variant_id', variantIds).is('branch_id', null)
        : Promise.resolve({ data: [] }),
    ])
    const productImages = imgs ?? []
    if (productImages.length) {
      images.value = productImages
    }
    else {
      images.value = optionSetImagePaths(currentProduct.option_sets).map((path, idx) => ({
        id: `opt-img-${idx}`,
        path,
      }))
    }
    selectedImageIndex.value = 0
    const byVariant: Record<string, number> = {}
    for (const row of (stockRows as any[]) ?? []) {
      byVariant[row.variant_id] = (byVariant[row.variant_id] ?? 0) + row.quantity
    }
    stockByVariant.value = byVariant
  }
}

onMounted(load)
</script>

<style scoped>
.product-media-wrap {
  max-width: 920px;
  margin-inline: auto;
}

.product-media-main {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-main-image {
  width: 100%;
  height: 100%;
}

.product-image-magnifier {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  border: 2px solid rgba(15, 111, 255, 0.45);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
  background-size: 220%;
  background-repeat: no-repeat;
  pointer-events: none;
}

.thumb-btn {
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  overflow: hidden;
  margin-right: 0.5rem;
  background: transparent;
}

.thumb-btn--active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.catalog-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(71, 85, 105, 0.9);
  font-size: 0.9rem;
}

.product-description :deep(p) {
  margin: 0 0 0.5rem;
}

.product-description :deep(p:last-child) {
  margin-bottom: 0;
}

.product-description :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
