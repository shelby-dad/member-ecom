<template>
  <div v-if="product">
    <h1 class="text-h4 mb-4">
      {{ product.name }}
    </h1>
    <div v-if="images.length > 0" class="d-flex gap-2 mb-4 overflow-x-auto pb-2">
      <v-img
        v-for="img in images"
        :key="img.id"
        :src="imageUrl(img.path)"
        min-width="120"
        height="120"
        cover
        class="rounded"
      />
    </div>
    <p class="text-body-1 text-medium-emphasis mb-4">
      {{ product.description || 'No description' }}
    </p>
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
            <td>{{ v.stock != null ? (v.stock > 0 ? `In stock (${v.stock})` : 'Out of stock') : '–' }}</td>
            <td>
              <v-btn
                size="small"
                color="primary"
                :disabled="v.stock !== undefined && v.stock <= 0"
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

const variantsWithStock = computed(() =>
  variants.value.map(v => ({ ...v, stock: stockByVariant.value[v.id] ?? null })),
)

function imageUrl(path: string) {
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}

function addToCart(v: any) {
  cart.addItem({
    variant_id: v.id,
    product_name: product.value!.name,
    variant_name: v.name,
    price: v.price,
    quantity: 1,
  })
  snack.value = true
}

async function load() {
  const { data: p } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).single()
  product.value = p ?? null
  if (p) {
    const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order')
    variants.value = v ?? []
    const variantIds = variants.value.map((x: any) => x.id)
    const [{ data: imgs }, { data: stockRows }] = await Promise.all([
      supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
      variantIds.length
        ? supabase.from('stock').select('variant_id, quantity').in('variant_id', variantIds).is('branch_id', null)
        : Promise.resolve({ data: [] }),
    ])
    images.value = imgs ?? []
    const byVariant: Record<string, number> = {}
    for (const row of stockRows ?? []) {
      byVariant[row.variant_id] = (byVariant[row.variant_id] ?? 0) + row.quantity
    }
    stockByVariant.value = byVariant
  }
}

onMounted(load)
</script>
