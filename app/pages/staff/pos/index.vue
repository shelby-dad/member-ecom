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
            <MemberSelectField
              v-model="selectedMember"
              label="Select member"
              variant="outlined"
              @update:member="onSelectMember"
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
            <v-btn color="primary" class="mt-3" :disabled="!canCheckout" :loading="creating" @click="onCompleteSale">
              Complete sale
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Products</v-card-title>
          <v-card-text>
            <v-text-field v-model="productSearch" label="Search" variant="outlined" density="comfortable" hide-details class="mb-2">
              <template #append-inner>
                <v-btn size="small" variant="text" icon="mdi-camera-outline" @click="openScanDialog" />
              </template>
            </v-text-field>
            <v-row v-if="paginatedVariants.length" class="mt-1">
              <v-col
                v-for="v in paginatedVariants"
                :key="v.id"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card class="pos-product-card h-100" variant="outlined" @click="addToPosCart(v)">
                  <div class="pos-product-media">
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
                    <div class="pos-product-overlay">
                      <div class="pos-product-overlay-bubble">
                        <v-icon size="34" class="pos-product-overlay-icon">mdi-cart-plus</v-icon>
                      </div>
                    </div>
                  </div>
                  <v-card-text class="pb-2">
                    <div class="text-subtitle-2 text-truncate">
                      {{ v.products?.name }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis text-truncate">
                      {{ v.name }}
                    </div>
                    <div class="text-subtitle-1 mt-2 font-weight-bold d-flex align-center ga-2">
                      <span>{{ formatPrice(v.price) }}</span>
                      <v-badge
                        v-if="cartCountByVariant[v.id]"
                        :content="cartCountByVariant[v.id]"
                        color="error"
                        inline
                        class="price-badge"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row v-else-if="variantsLoading" class="mt-1">
              <v-col
                v-for="n in 6"
                :key="`pos-skeleton-${n}`"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card class="pos-product-card h-100" variant="outlined">
                  <v-skeleton-loader type="image" height="140" />
                  <v-card-text class="pb-2">
                    <v-skeleton-loader type="text" class="mb-1" />
                    <v-skeleton-loader type="text" class="mb-1" />
                    <v-skeleton-loader type="text" width="90px" />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="py-8 text-center text-medium-emphasis">
              No products found.
            </div>
            <div class="d-flex align-center justify-space-between mt-3 flex-wrap ga-2">
              <v-select
                v-model="variantsPerPage"
                :items="variantsPerPageOptions"
                label="Items per page"
                variant="outlined"
                density="compact"
                hide-details
                class="mt-2"
                style="max-width: 160px"
              />
              <v-spacer />
              <div v-if="totalVariantPages > 1" class="d-flex justify-center">
                <v-pagination
                  v-model="currentVariantPage"
                  :length="totalVariantPages"
                  :total-visible="7"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="showScannerDialog" max-width="640" persistent>
      <v-card>
        <v-card-title>Scan barcode to add product</v-card-title>
        <v-card-text>
          <p class="text-caption text-medium-emphasis mb-2">
            Allow camera access and place barcode inside the frame.
          </p>
          <div class="scanner-stage">
            <video ref="scannerVideoRef" class="scanner-video" autoplay muted playsinline />
            <div class="scanner-guide">
              <div class="scanner-line" />
            </div>
          </div>
          <p v-if="scannerError" class="text-caption text-error mt-2 mb-0">
            {{ scannerError }}
          </p>
          <div class="d-flex align-center ga-2 mt-3">
            <input ref="scannerImageInputRef" type="file" accept="image/*" class="d-none" @change="onBarcodeImageSelected">
            <v-btn variant="outlined" prepend-icon="mdi-image-search-outline" :loading="scannerImageLoading" @click="scannerImageInputRef?.click()">
              Scan from image
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeScanDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <VariantPickerDialog
      v-model="showBarcodeVariantDialog"
      :product-name="barcodeVariantProductName"
      :variants="barcodeVariantOptions"
      @select="addScannedVariantToCart"
    />
    <v-dialog v-model="showBankTransferDialog" max-width="560">
      <v-card>
        <v-card-title>Bank transfer checkout</v-card-title>
        <v-card-text class="checkout-modal-body">
          <div class="mb-2"><strong>Total amount:</strong> {{ formatPrice(finalTotal) }}</div>
          <div class="mb-2"><strong>Payment Name:</strong> {{ selectedPaymentMethod?.name || '-' }}</div>
          <div class="mb-2"><strong>Account Name:</strong> {{ selectedPaymentMethod?.account_name || '-' }}</div>
          <div class="mb-2"><strong>Account Number:</strong> {{ selectedPaymentMethod?.account_number || '-' }}</div>
          <div class="mb-3">
            <strong>QR:</strong>
            <div class="mt-2">
              <v-img
                v-if="selectedPaymentMethodQrUrl"
                :src="selectedPaymentMethodQrUrl"
                max-width="220"
                max-height="220"
                class="rounded border"
                cover
              />
              <span v-else>-</span>
            </div>
          </div>
          <v-text-field
            v-model="bankTransferTransactionId"
            label="Transaction ID (optional)"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions class="checkout-modal-actions">
          <v-spacer />
          <v-btn variant="text" :disabled="creating" @click="showBankTransferDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="creating" @click="confirmBankTransferCheckout">
            Checkout
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showCashCheckoutDialog" max-width="460">
      <v-card>
        <v-card-title>Cash checkout</v-card-title>
        <v-card-text class="checkout-modal-body">
          <div class="mb-2 d-flex align-center justify-space-between">
            <span class="text-medium-emphasis">Receive Amount</span>
            <strong>{{ cashReceiveAmount > 0 ? formatPrice(cashReceiveAmount) : '-' }}</strong>
          </div>
          <div class="mb-2 d-flex align-center justify-space-between">
            <span class="text-medium-emphasis">Total amount</span>
            <strong>{{ formatPrice(finalTotal) }}</strong>
          </div>
          <div class="mb-3 d-flex align-center justify-space-between">
            <span class="text-medium-emphasis">Change Amount</span>
            <strong>{{ formatPrice(cashChangeAmount) }}</strong>
          </div>
          <v-text-field
            v-model="cashReceiveInput"
            label="Receive Amount"
            variant="outlined"
            density="comfortable"
            readonly
            class="mb-2"
          />
          <div class="cash-pad-wrap">
            <div class="cash-pad">
              <v-btn v-for="key in cashPadKeys" :key="key" variant="outlined" class="cash-pad-btn" @click="onCashPadKey(key)">
                {{ key }}
              </v-btn>
              <v-btn variant="outlined" color="warning" class="cash-pad-btn" @click="cashReceiveInput = ''">C</v-btn>
              <v-btn variant="outlined" class="cash-pad-btn" icon="mdi-backspace-outline" @click="onCashPadBackspace" />
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="checkout-modal-actions">
          <v-spacer />
          <v-btn variant="text" :disabled="creating" @click="showCashCheckoutDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="creating" :disabled="cashReceiveAmount < finalTotal" @click="confirmCashCheckout">
            Checkout
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
const selectedMember = ref<string | null>(null)
const selectedMemberProfile = ref<any>(null)
const selectedPaymentMethodId = ref<string | null>(null)
const paymentMethods = ref<Array<{
  id: string
  name: string
  type: 'wallet' | 'bank_transfer' | 'cash' | 'cod'
  account_name?: string | null
  account_number?: string | null
  image_path?: string | null
  display_name: string
}>>([])
const loadingPaymentMethods = ref(false)
const promotions = ref<any[]>([])
const selectedPromoId = ref<string | null>(null)
const productSearch = ref('')
const variants = ref<any[]>([])
const variantsLoading = ref(false)
const productImageById = ref<Record<string, string>>({})
const currentVariantPage = ref(1)
const variantsPerPage = ref(15)
const variantsPerPageOptions = [15, 30, 60]
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
const showBarcodeVariantDialog = ref(false)
const barcodeVariantProductName = ref('')
const barcodeVariantOptions = ref<any[]>([])
const showBankTransferDialog = ref(false)
const bankTransferTransactionId = ref('')
const showCashCheckoutDialog = ref(false)
const cashReceiveInput = ref('')
const showScannerDialog = ref(false)
const scannerError = ref('')
const scannerImageLoading = ref(false)
const scannerVideoRef = ref<HTMLVideoElement | null>(null)
const scannerImageInputRef = ref<HTMLInputElement | null>(null)
let scannerControls: { stop: () => void } | null = null
let scannerReader: any = null
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
const selectedPaymentMethodQrUrl = computed(() => {
  const path = String(selectedPaymentMethod.value?.image_path ?? '').trim()
  return path ? toPublicProductImageUrl(path) : ''
})
const cashPadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']
const cashReceiveAmount = computed(() => {
  const normalized = String(cashReceiveInput.value ?? '').replace(/[^0-9.]/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : 0
})
const cashChangeAmount = computed(() => Math.max(0, Number((cashReceiveAmount.value - finalTotal.value).toFixed(2))))
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
const cartCountByVariant = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  for (const item of posCart.value) {
    out[item.variant_id] = (out[item.variant_id] ?? 0) + Number(item.quantity ?? 0)
  }
  return out
})

const filteredVariants = computed(() => {
  return variants.value
})
const totalVariantPages = computed(() => Math.max(1, Math.ceil(filteredVariants.value.length / variantsPerPage.value)))
const paginatedVariants = computed(() => {
  const start = (currentVariantPage.value - 1) * variantsPerPage.value
  return filteredVariants.value.slice(start, start + variantsPerPage.value)
})

function productVariantLabel(item: { product_name: string; variant_name: string }) {
  const productName = (item.product_name || '').trim()
  const variantName = (item.variant_name || '').trim()
  if (!productName) return variantName
  if (!variantName) return productName
  return `${productName} + ${variantName}`
}

function productImageUrl(variant: any) {
  const variantImage = variantOptionImagePath(variant)
  if (variantImage)
    return toPublicProductImageUrl(variantImage)

  const productId = variant?.products?.id as string | undefined
  if (!productId) return ''
  const path = productImageById.value[productId]
  if (!path) return ''
  return toPublicProductImageUrl(path)
}

function toPublicProductImageUrl(path: string) {
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

function variantOptionImagePath(variant: any): string {
  const optionSets = Array.isArray(variant?.products?.option_sets) ? variant.products.option_sets : []
  const imageSets = optionSets.filter((set: any) => (set?.type ?? 'text') === 'image')
  if (!imageSets.length)
    return ''

  const variantTokens = String(variant?.name ?? '')
    .split('/')
    .map((token: string) => token.trim().toLowerCase())
    .filter(Boolean)

  if (!variantTokens.length)
    return ''

  for (const set of imageSets) {
    const values = Array.isArray(set?.values) ? set.values : []
    for (const raw of values) {
      const label = String(raw?.label ?? '').trim().toLowerCase()
      const value = typeof raw === 'string'
        ? raw.trim()
        : String(raw?.value ?? '').trim()
      if (!label || !value)
        continue
      if (variantTokens.includes(label))
        return value
    }
  }

  return ''
}

async function loadPaymentMethods() {
  loadingPaymentMethods.value = true
  try {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name, type, account_name, account_number, image_path')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    paymentMethods.value = (data ?? []).map((m: any) => ({
      ...m,
      display_name: `${m.name} (${String(m.type || '').replace('_', ' ')})`,
    }))
    applyCashDefaultIfNeeded()
  }
  finally {
    loadingPaymentMethods.value = false
  }
}

async function loadPromotions() {
  const data = await $fetch<any[]>('/api/promotions/active')
  promotions.value = data ?? []
}

function onSelectMember(member: any | null) {
  if (!member) {
    selectedMemberProfile.value = null
    return
  }
  selectedMemberProfile.value = member
}

function getCashPaymentMethodId() {
  return paymentMethods.value.find(method => method.type === 'cash')?.id ?? null
}

function applyCashDefaultIfNeeded() {
  const cashId = getCashPaymentMethodId()
  if (!cashId)
    return
  const hasSelected = paymentMethods.value.some(method => method.id === selectedPaymentMethodId.value)
  if (!hasSelected)
    selectedPaymentMethodId.value = cashId
}

async function loadVariants() {
  variantsLoading.value = true
  try {
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
  finally {
    variantsLoading.value = false
  }
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
    playPeeSound('plus')
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
    playPeeSound('plus')
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
  if (!posCart.value[idx]) return
  if (posCart.value[idx].quantity <= 1) {
    removePosItem(idx)
    playPeeSound('minus')
    return
  }
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

async function openScanDialog() {
  showScannerDialog.value = true
  await nextTick()
  await startScanner()
}

function stopScanner() {
  if (!scannerControls) return
  try {
    scannerControls.stop()
  }
  finally {
    scannerControls = null
  }
}

function humanizeScannerError(error: any) {
  const msg = String(error?.message ?? '')
  if (!msg) return 'Scanner failed. Please try again.'
  if (msg.includes('No MultiFormat Readers were able to detect the code'))
    return 'No barcode detected. Try better lighting and keep barcode fully inside frame.'
  if (msg.toLowerCase().includes('permission'))
    return 'Camera permission denied. Please allow camera access in browser settings.'
  if (msg.toLowerCase().includes('notfounderror'))
    return 'No camera device found.'
  if (msg.toLowerCase().includes('notreadableerror'))
    return 'Camera is busy in another app/tab. Close it and retry.'
  return msg
}

async function addScannedBarcodeToCart(code: string) {
  const cleaned = code.trim()
  if (!cleaned) return
  let payload: any
  try {
    payload = await $fetch<any>('/api/pos/barcode', { query: { code: cleaned } })
  }
  catch {
    snackMsg.value = 'Barcode invalid'
    snackSuccess.value = false
    snack.value = true
    return
  }

  if (!payload?.product || !Array.isArray(payload.variants)) {
    snackMsg.value = 'Barcode invalid'
    snackSuccess.value = false
    snack.value = true
    return
  }

  const variants = payload.variants
    .filter((variant: any) => !payload.product.has_variants || Number(variant.price ?? 0) > 0)
    .map((variant: any) => ({
      ...variant,
      products: payload.product,
    }))

  if (!variants.length) {
    snackMsg.value = 'No purchasable variants for this product.'
    snackSuccess.value = false
    snack.value = true
    return
  }

  if (payload.product.has_variants) {
    barcodeVariantProductName.value = String(payload.product.name ?? '')
    barcodeVariantOptions.value = variants
    showBarcodeVariantDialog.value = true
    return
  }

  const candidate = variants.find((variant: any) => !variant.track_stock || Number(variant.available_stock ?? 0) > 0) ?? variants[0]
  addToPosCart(candidate)
}

function addScannedVariantToCart(variant: any) {
  showBarcodeVariantDialog.value = false
  addToPosCart(variant)
}

async function startScanner() {
  if (!import.meta.client) return
  scannerError.value = ''
  stopScanner()
  if (!scannerVideoRef.value) return
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
    if (!scannerReader) {
      const hints = new Map<any, any>()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)
      scannerReader = new BrowserMultiFormatReader(hints)
    }
    scannerControls = await scannerReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      scannerVideoRef.value,
      async (result: any, error: any) => {
        if (result?.getText) {
          const code = String(result.getText()).trim()
          closeScanDialog()
          try {
            await addScannedBarcodeToCart(code)
          }
          catch (e: any) {
            snackMsg.value = e?.data?.message ?? e?.message ?? 'Could not add scanned product.'
            snackSuccess.value = false
            snack.value = true
          }
          return
        }
        const errName = String(error?.name ?? '')
        if (error && errName && !['NotFoundException', 'ChecksumException', 'FormatException'].includes(errName))
          scannerError.value = humanizeScannerError(error)
      },
    )
  }
  catch (e: any) {
    scannerError.value = humanizeScannerError(e)
  }
}

function closeScanDialog() {
  showScannerDialog.value = false
  stopScanner()
}

async function onBarcodeImageSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  scannerImageLoading.value = true
  scannerError.value = ''
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    if (!scannerReader)
      scannerReader = new BrowserMultiFormatReader()
    const url = URL.createObjectURL(file)
    try {
      const result = await scannerReader.decodeFromImageUrl(url)
      const code = result?.getText?.() ? String(result.getText()).trim() : ''
      if (!code)
        throw new Error('No barcode found in selected image.')
      closeScanDialog()
      await addScannedBarcodeToCart(code)
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }
  catch (e: any) {
    scannerError.value = humanizeScannerError(e)
  }
  finally {
    scannerImageLoading.value = false
    input.value = ''
  }
}

function onCompleteSale() {
  if (!canCheckout.value)
    return
  if (selectedPaymentMethod.value?.type === 'cash') {
    showCashCheckoutDialog.value = true
    return
  }
  if (selectedPaymentMethod.value?.type === 'bank_transfer') {
    showBankTransferDialog.value = true
    return
  }
  createOrder()
}

function confirmBankTransferCheckout() {
  createOrder({ transactionId: bankTransferTransactionId.value.trim() || undefined })
}

function onCashPadKey(key: string) {
  if (key === '.') {
    if (!cashReceiveInput.value.includes('.'))
      cashReceiveInput.value = cashReceiveInput.value || '0.'
    return
  }
  const next = `${cashReceiveInput.value}${key}`
  const dotIndex = next.indexOf('.')
  if (dotIndex >= 0 && next.length - dotIndex - 1 > 2)
    return
  cashReceiveInput.value = next
}

function onCashPadBackspace() {
  cashReceiveInput.value = cashReceiveInput.value.slice(0, -1)
}

function onCashModalKeydown(event: KeyboardEvent) {
  if (!showCashCheckoutDialog.value)
    return

  const key = event.key
  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    onCashPadKey(key)
    return
  }
  if (key === '.') {
    event.preventDefault()
    onCashPadKey('.')
    return
  }
  if (key === 'Backspace' || key === 'Delete') {
    event.preventDefault()
    onCashPadBackspace()
    return
  }
  if (key === 'Enter') {
    event.preventDefault()
    confirmCashCheckout()
    return
  }
  if (key === 'Escape') {
    event.preventDefault()
    showCashCheckoutDialog.value = false
  }
}

function confirmCashCheckout() {
  if (cashReceiveAmount.value < finalTotal.value)
    return
  createOrder()
}

async function createOrder(options?: { transactionId?: string }) {
  if (!selectedMember.value || !selectedPaymentMethodId.value || !posCart.value.length) return
  const methodType = selectedPaymentMethod.value?.type
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
      transaction_id: options?.transactionId ?? undefined,
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
    snackMsg.value = (methodType === 'cash' || methodType === 'bank_transfer') ? 'Sale Completed' : 'Order Created'
    snackSuccess.value = true
    snack.value = true
    posCart.value = []
    selectedPaymentMethodId.value = null
    selectedPromoId.value = null
    showBankTransferDialog.value = false
    bankTransferTransactionId.value = ''
    showCashCheckoutDialog.value = false
    cashReceiveInput.value = ''
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
  loadPaymentMethods()
  loadPromotions()
  loadVariants()
  window.addEventListener('keydown', onCashModalKeydown)
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

watch(variantsPerPage, () => {
  currentVariantPage.value = 1
})

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
  stopScanner()
  window.removeEventListener('keydown', onCashModalKeydown)
})
</script>

<style scoped>
.pos-product-card {
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.pos-product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.14);
}

.pos-product-media {
  position: relative;
  z-index: 1;
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

.pos-product-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.26);
  opacity: 0;
  transition: opacity 0.16s ease;
  z-index: 2;
}

.pos-product-card:hover .pos-product-overlay {
  opacity: 1;
}

.pos-product-overlay-icon {
  color: #22c55e;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
}

.pos-product-overlay-bubble {
  width: 66px;
  height: 66px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
}

.pos-product-badge {
  display: none;
}

.price-badge :deep(.v-badge__badge) {
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 18px;
}

.qty-minus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-error));
}

.qty-plus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-success));
}

.cash-pad-wrap {
  display: flex;
  justify-content: center;
}

.cash-pad {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  gap: 14px;
  justify-content: center;
}

.cash-pad-btn {
  width: 64px;
  min-width: 64px;
  height: 64px;
  border-radius: 999px;
  font-size: 1.1rem;
  font-weight: 600;
}

.checkout-modal-body {
  max-height: min(60vh, 520px);
  overflow-y: auto;
  padding-bottom: 90px;
}

.checkout-modal-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 14px 16px 18px;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(148, 163, 184, 0.3);
}

.scanner-stage {
  position: relative;
}

.scanner-video {
  width: 100%;
  min-height: 260px;
  max-height: 380px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #0f172a;
  object-fit: cover;
}

.scanner-guide {
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(86%, 420px);
  height: min(54%, 180px);
  transform: translate(-50%, -50%);
  border: 2px solid rgba(34, 197, 94, 0.9);
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.25);
  overflow: hidden;
}

.scanner-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(34, 197, 94, 0.95);
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.75);
  animation: scanner-line-move 1.8s linear infinite;
}

@keyframes scanner-line-move {
  0% { top: 0; }
  100% { top: calc(100% - 2px); }
}
</style>
