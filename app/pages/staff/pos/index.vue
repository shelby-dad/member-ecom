<template>
  <div>
    <h1 class="text-h4 mb-4">
      Point of sale
    </h1>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>Member</v-card-title>
          <v-card-text>
            <v-autocomplete
              v-model="selectedMember"
              :items="members"
              item-title="email"
              item-value="id"
              label="Select member"
              variant="outlined"
              :loading="loadingMembers"
              @update:model-value="onSelectMember"
            />
            <p v-if="selectedMemberProfile" class="text-caption mt-2">
              {{ selectedMemberProfile.full_name || selectedMemberProfile.email }}
            </p>
          </v-card-text>
        </v-card>
        <v-card>
          <v-card-title>Cart</v-card-title>
          <v-card-text>
            <v-table v-if="posCart.length">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Line total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(i, idx) in posCart" :key="idx">
                  <td>{{ productVariantLabel(i) }}</td>
                  <td>{{ formatPrice(i.price) }}</td>
                  <td>
                    <div class="d-flex align-center ga-1">
                      <v-btn
                        size="x-small"
                        icon
                        variant="text"
                        :disabled="i.quantity <= 1"
                        class="qty-minus-btn"
                        @click="decreaseQty(idx)"
                      >
                        <v-icon>mdi-minus-circle</v-icon>
                      </v-btn>
                      <span class="text-body-2 font-weight-medium" style="min-width: 24px; text-align: center">{{ i.quantity }}</span>
                      <v-btn
                        size="x-small"
                        icon
                        variant="text"
                        class="qty-plus-btn"
                        :disabled="i.track_stock && i.quantity >= i.available_stock"
                        @click="increaseQty(idx)"
                      >
                        <v-icon>mdi-plus-circle</v-icon>
                      </v-btn>
                    </div>
                  </td>
                  <td>{{ formatPrice(i.price * i.quantity) }}</td>
                  <td>
                    <v-btn size="x-small" icon variant="text" @click="removePosItem(idx)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <p v-else class="text-medium-emphasis">
              Cart is empty. Search products below and add.
            </p>
            <v-select
              v-model="selectedPaymentMethodId"
              :items="paymentMethods"
              item-title="display_name"
              item-value="id"
              label="Payment method *"
              variant="outlined"
              density="comfortable"
              class="mt-3"
              :loading="loadingPaymentMethods"
              :disabled="!posCart.length"
            />
            <p v-if="selectedPaymentMethod?.type === 'wallet'" class="text-caption text-medium-emphasis mt-1">
              Member wallet: {{ formatPrice(Number(selectedMemberProfile?.wallet_balance ?? 0)) }}
            </p>
            <div v-if="posCart.length" class="mt-3">
              <v-select
                v-model="selectedPromoId"
                :items="promoOptions"
                item-title="label"
                item-value="id"
                label="Promo package (optional)"
                variant="outlined"
                density="comfortable"
                clearable
                class="mb-2"
              />
              <div class="d-flex align-center justify-space-between">
                <span class="text-medium-emphasis">Subtotal</span>
                <strong>{{ formatPrice(posTotal) }}</strong>
              </div>
              <div class="d-flex align-center justify-space-between">
                <span class="text-medium-emphasis">Discount</span>
                <strong>{{ formatPrice(promoDiscount) }}</strong>
              </div>
              <div class="d-flex align-center justify-space-between">
                <span class="text-medium-emphasis">Total amount</span>
                <strong class="text-h6">{{ formatPrice(finalTotal) }}</strong>
              </div>
            </div>
            <v-btn color="primary" class="mt-3" :disabled="!canCheckout" :loading="creating" @click="createOrder">
              Complete sale
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Products</v-card-title>
          <v-card-text>
            <v-text-field v-model="productSearch" label="Search" variant="outlined" density="comfortable" hide-details class="mb-2" />
            <v-row v-if="paginatedVariants.length" class="mt-1">
              <v-col
                v-for="v in paginatedVariants"
                :key="v.id"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card class="pos-product-card h-100" variant="outlined">
                  <v-img
                    v-if="productImageUrl(v)"
                    :src="productImageUrl(v)"
                    height="140"
                    cover
                    class="pos-product-image"
                  />
                  <div v-else class="pos-product-placeholder">
                    <v-icon size="26">mdi-image-off-outline</v-icon>
                    <span>No image</span>
                  </div>
                  <v-card-text class="pb-2">
                    <div class="text-subtitle-2 text-truncate">
                      {{ v.products?.name }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis text-truncate">
                      {{ v.name }}
                    </div>
                    <div class="text-subtitle-1 mt-2 font-weight-bold">
                      {{ formatPrice(v.price) }}
                    </div>
                  </v-card-text>
                  <v-card-actions class="pt-0">
                    <v-btn block color="primary" @click="addToPosCart(v)">
                      Add
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="py-8 text-center text-medium-emphasis">
              No products found.
            </div>
            <div v-if="totalVariantPages > 1" class="d-flex justify-center mt-3">
              <v-pagination
                v-model="currentVariantPage"
                :length="totalVariantPages"
                :total-visible="7"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snack" :color="snackSuccess ? 'success' : 'error'">
      {{ snackMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const members = ref<any[]>([])
const loadingMembers = ref(false)
const selectedMember = ref<string | null>(null)
const selectedMemberProfile = ref<any>(null)
const selectedPaymentMethodId = ref<string | null>(null)
const paymentMethods = ref<Array<{ id: string; name: string; type: 'wallet' | 'bank_transfer' | 'cash' | 'cod'; display_name: string }>>([])
const loadingPaymentMethods = ref(false)
const promotions = ref<any[]>([])
const selectedPromoId = ref<string | null>(null)
const productSearch = ref('')
const variants = ref<any[]>([])
const productImageById = ref<Record<string, string>>({})
const currentVariantPage = ref(1)
const variantsPerPage = 9
const posCart = ref<Array<{
  variant_id: string
  product_name: string
  variant_name: string
  price: number
  quantity: number
  track_stock: boolean
  available_stock: number
}>>([])
const creating = ref(false)
const snack = ref(false)
const snackSuccess = ref(false)
const snackMsg = ref('')
let peeAudioCtx: AudioContext | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

const posTotal = computed(() => posCart.value.reduce((s, i) => s + i.price * i.quantity, 0))
const selectedPromo = computed(() => promotions.value.find((p: any) => p.id === selectedPromoId.value) ?? null)
const promoDiscount = computed(() => {
  const promo = selectedPromo.value
  if (!promo) return 0
  if (posTotal.value < Number(promo.min_subtotal ?? 0)) return 0
  let discount = promo.discount_type === 'percent'
    ? (posTotal.value * Number(promo.discount_value ?? 0)) / 100
    : Number(promo.discount_value ?? 0)
  if (promo.max_discount != null)
    discount = Math.min(discount, Number(promo.max_discount))
  return Math.max(0, Math.min(discount, posTotal.value))
})
const finalTotal = computed(() => Math.max(0, posTotal.value - promoDiscount.value))
const selectedPaymentMethod = computed(() => paymentMethods.value.find(p => p.id === selectedPaymentMethodId.value) ?? null)
const canCheckout = computed(() => {
  if (!selectedMember.value || !selectedPaymentMethodId.value || !posCart.value.length)
    return false
  if (selectedPaymentMethod.value?.type === 'wallet') {
    const balance = Number(selectedMemberProfile.value?.wallet_balance ?? 0)
    return finalTotal.value <= balance
  }
  return true
})
const promoOptions = computed(() => promotions.value.map((p: any) => ({
  id: p.id,
  label: `${p.name}${p.code ? ` (${p.code})` : ''}`,
})))

const filteredVariants = computed(() => {
  return variants.value
})
const totalVariantPages = computed(() => Math.max(1, Math.ceil(filteredVariants.value.length / variantsPerPage)))
const paginatedVariants = computed(() => {
  const start = (currentVariantPage.value - 1) * variantsPerPage
  return filteredVariants.value.slice(start, start + variantsPerPage)
})

function productVariantLabel(item: { product_name: string; variant_name: string }) {
  const productName = (item.product_name || '').trim()
  const variantName = (item.variant_name || '').trim()
  if (!productName) return variantName
  if (!variantName) return productName
  return `${productName} + ${variantName}`
}

function productImageUrl(variant: any) {
  const productId = variant?.products?.id as string | undefined
  if (!productId) return ''
  const path = productImageById.value[productId]
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function firstOptionImagePath(optionSets: any): string {
  const sets = Array.isArray(optionSets) ? optionSets : []
  for (const set of sets) {
    if ((set?.type ?? 'text') !== 'image') continue
    const values = Array.isArray(set?.values) ? set.values : []
    for (const raw of values) {
      const path = typeof raw === 'string'
        ? raw.trim()
        : String(raw?.value ?? '').trim()
      if (path)
        return path
    }
  }
  return ''
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    const data = await $fetch<any[]>('/api/pos/members')
    members.value = data ?? []
  }
  finally {
    loadingMembers.value = false
  }
}

async function loadPaymentMethods() {
  loadingPaymentMethods.value = true
  try {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name, type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    paymentMethods.value = (data ?? []).map((m: any) => ({
      ...m,
      display_name: `${m.name} (${String(m.type || '').replace('_', ' ')})`,
    }))
  }
  finally {
    loadingPaymentMethods.value = false
  }
}

async function loadPromotions() {
  const data = await $fetch<any[]>('/api/promotions/active')
  promotions.value = data ?? []
}

function onSelectMember(id: string | null) {
  if (!id) {
    selectedMemberProfile.value = null
    return
  }
  selectedMemberProfile.value = members.value.find(m => m.id === id) ?? null
}

async function loadVariants() {
  const variantList: any[] = await $fetch<any[]>('/api/pos/variants', {
    query: {
      q: productSearch.value || undefined,
      limit: 300,
    },
  }) ?? []
  const variantIds = variantList.map(v => v.id)
  const { data: stockRows } = variantIds.length
    ? await supabase.from('stock').select('variant_id, quantity').in('variant_id', variantIds)
    : { data: [] }
  const stockByVariant: Record<string, number> = {}
  for (const row of (stockRows as any[]) ?? [])
    stockByVariant[row.variant_id] = (stockByVariant[row.variant_id] ?? 0) + Number(row.quantity ?? 0)
  for (const v of variantList) {
    v.track_stock = (v.track_stock ?? v.products?.track_stock ?? true) !== false
    v.available_stock = stockByVariant[v.id] ?? 0
  }
  variants.value = variantList
  const productIds = [...new Set(variantList.map((v: any) => v.products?.id).filter(Boolean))]
  if (!productIds.length) {
    productImageById.value = {}
    return
  }
  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, path, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true })
  const imageMap: Record<string, string> = {}
  for (const img of (images as any[]) ?? []) {
    if (!imageMap[img.product_id] && img.path)
      imageMap[img.product_id] = img.path
  }
  for (const v of variantList) {
    const pid = v.products?.id
    if (!pid || imageMap[pid]) continue
    const optionImage = firstOptionImagePath(v.products?.option_sets)
    if (optionImage)
      imageMap[pid] = optionImage
  }
  productImageById.value = imageMap
}

function addToPosCart(v: any) {
  const existing = posCart.value.find(i => i.variant_id === v.id)
  if (existing) {
    if (existing.track_stock && existing.quantity >= existing.available_stock) {
      snackMsg.value = 'Cannot add more than available stock'
      snackSuccess.value = false
      snack.value = true
      return
    }
    existing.quantity += 1
  }
  else {
    const trackStock = (v.track_stock ?? true) !== false
    const available = Number(v.available_stock ?? 0)
    if (trackStock && available <= 0) {
      snackMsg.value = 'Out of stock'
      snackSuccess.value = false
      snack.value = true
      return
    }
    posCart.value.push({
      variant_id: v.id,
      product_name: v.products?.name ?? '',
      variant_name: v.name,
      price: v.price,
      quantity: 1,
      track_stock: trackStock,
      available_stock: available,
    })
  }
}

function removePosItem(idx: number) {
  posCart.value.splice(idx, 1)
}

function increaseQty(idx: number) {
  const item = posCart.value[idx]
  if (item.track_stock && item.quantity >= item.available_stock)
    return
  posCart.value[idx].quantity += 1
  playPeeSound('plus')
}

function decreaseQty(idx: number) {
  if (posCart.value[idx].quantity <= 1)
    return
  posCart.value[idx].quantity -= 1
  playPeeSound('minus')
}

function playPeeSound(type: 'plus' | 'minus') {
  const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
  if (!AudioCtx) return
  if (!peeAudioCtx)
    peeAudioCtx = new AudioCtx()
  const ctx = peeAudioCtx
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = type === 'plus' ? 1046.5 : 784
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(ctx.destination)
  const now = ctx.currentTime
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
  osc.start(now)
  osc.stop(now + 0.12)
}

async function createOrder() {
  if (!selectedMember.value || !selectedPaymentMethodId.value || !posCart.value.length) return
  if (selectedPaymentMethod.value?.type === 'wallet') {
    const balance = Number(selectedMemberProfile.value?.wallet_balance ?? 0)
    if (!Number.isFinite(balance) || finalTotal.value > balance) {
      snackMsg.value = 'Member wallet balance is insufficient.'
      snackSuccess.value = false
      snack.value = true
      return
    }
  }
  creating.value = true
  snack.value = false
  try {
    const body = {
      user_id: selectedMember.value,
      payment_method_id: selectedPaymentMethodId.value,
      promo_id: selectedPromoId.value ?? null,
      items: posCart.value.map(i => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name: i.variant_name,
        price: i.price,
        quantity: i.quantity,
      })),
    }
    await $fetch('/api/pos/orders', { method: 'POST', body })
    snackMsg.value = 'Order created.'
    snackSuccess.value = true
    snack.value = true
    posCart.value = []
    selectedPaymentMethodId.value = null
    selectedPromoId.value = null
  }
  catch (e: any) {
    const statusCode = Number(e?.statusCode ?? e?.response?.status ?? 0)
    const msg = e?.data?.message ?? e?.message ?? 'Failed'
    snackMsg.value = statusCode ? `${msg} (HTTP ${statusCode})` : msg
    snackSuccess.value = false
    snack.value = true
    console.error('POS order failed', { statusCode, error: e, payload: {
      user_id: selectedMember.value,
      payment_method_id: selectedPaymentMethodId.value,
      promo_id: selectedPromoId.value ?? null,
      total: finalTotal.value,
    } })
  }
  finally {
    creating.value = false
  }
}

onMounted(() => {
  loadMembers()
  loadPaymentMethods()
  loadPromotions()
  loadVariants()
})

watch(productSearch, () => {
  currentVariantPage.value = 1
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadVariants()
  }, 220)
})

watch(filteredVariants, () => {
  if (currentVariantPage.value > totalVariantPages.value)
    currentVariantPage.value = totalVariantPages.value
})

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})
</script>

<style scoped>
.pos-product-card {
  border-radius: 12px;
  overflow: hidden;
}

.pos-product-image {
  background: rgba(148, 163, 184, 0.12);
}

.pos-product-placeholder {
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(100, 116, 139, 0.95);
  background: rgba(148, 163, 184, 0.12);
  font-size: 0.82rem;
}

.qty-minus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-error));
}

.qty-plus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-success));
}
</style>
