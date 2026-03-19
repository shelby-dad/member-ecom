<template>
  <div>
    <h1 class="text-h4 mb-4">
      Checkout
    </h1>
    <v-card v-if="!cart.hydrated.value || initialLoading" class="mb-4">
      <v-card-title>Order summary</v-card-title>
      <v-card-text>
        <v-skeleton-loader type="table-thead, table-row-divider@3" />
      </v-card-text>
    </v-card>
    <v-card v-else-if="cart.items.value.length" class="mb-4">
      <v-card-title>Order summary</v-card-title>
      <v-table class="checkout-table">
        <colgroup>
          <col class="col-select">
          <col class="col-product">
          <col class="col-variant">
          <col class="col-price">
          <col class="col-qty">
          <col class="col-total">
          <col class="col-action">
        </colgroup>
        <thead>
          <tr>
            <th>
              <v-checkbox-btn
                :model-value="allRowsSelected"
                :indeterminate="someRowsSelected && !allRowsSelected"
                color="primary"
                density="compact"
                @update:model-value="toggleSelectAll"
              />
            </th>
            <th>Product</th>
            <th>Variant</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in cart.items.value" :key="i.variant_id">
            <td>
              <v-checkbox-btn
                :model-value="isRowSelected(i.variant_id)"
                color="primary"
                density="compact"
                @update:model-value="toggleRowSelection(i.variant_id, $event)"
              />
            </td>
            <td>{{ i.product_name }}</td>
            <td>{{ i.variant_name }}</td>
            <td>{{ formatPrice(i.price) }}</td>
            <td>
              <div class="d-flex align-center ga-1">
                <v-btn
                  size="x-small"
                  icon
                  variant="text"
                  class="qty-minus-btn"
                  @click="decreaseQty(i.variant_id, i.quantity)"
                >
                  <v-icon>mdi-minus-circle</v-icon>
                </v-btn>
                <span class="text-body-2 font-weight-medium qty-value">{{ i.quantity }}</span>
                <v-btn
                  size="x-small"
                  icon
                  variant="text"
                  class="qty-plus-btn"
                  @click="increaseQty(i.variant_id, i.quantity)"
                >
                  <v-icon>mdi-plus-circle</v-icon>
                </v-btn>
              </div>
            </td>
            <td>{{ formatPrice(i.price * i.quantity) }}</td>
            <td>
              <v-btn
                size="x-small"
                icon
                variant="text"
                @click="removeCheckoutItem(i.variant_id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
          <span class="text-caption text-medium-emphasis">
            {{ selectedCartVariantIds.length }} product(s) selected
          </span>
          <div class="d-flex align-center ga-2">
            <v-btn
              size="small"
              variant="outlined"
              color="error"
              :disabled="selectedCartVariantIds.length === 0"
              @click="removeSelectedItems"
            >
              Remove Selected
            </v-btn>
            <v-btn
              size="small"
              color="primary"
              :disabled="selectedCartVariantIds.length === 0"
              @click="startSelectedCheckout"
            >
              Checkout Selected
            </v-btn>
          </div>
        </div>
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-medium-emphasis">Subtotal</span>
          <strong>{{ formatPrice(checkoutSelectionActive ? checkoutSubtotal : cart.total.value) }}</strong>
        </div>
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-medium-emphasis">Discount</span>
          <strong>{{ formatPrice(discountTotal) }}</strong>
        </div>
        <div class="d-flex align-center justify-space-between">
          <span class="text-medium-emphasis">Total</span>
          <strong class="text-h6">{{ formatPrice(finalTotal) }}</strong>
        </div>
      </v-card-text>
    </v-card>
    <v-card v-else class="mb-4">
      <v-card-text>Your cart is empty.</v-card-text>
      <v-card-actions>
        <v-btn to="/member/catalog">Browse catalog</v-btn>
      </v-card-actions>
    </v-card>
    <v-card v-if="!cart.hydrated.value || initialLoading" class="mb-4">
      <v-card-title>Checkout</v-card-title>
      <v-card-text>
        <v-skeleton-loader type="list-item-two-line@5, actions" />
      </v-card-text>
    </v-card>
    <v-card v-else-if="cart.items.value.length && checkoutSelectionActive">
      <v-card-title>Shipping address</v-card-title>
      <v-card-text>
        <div class="d-flex justify-end mb-2">
          <v-btn size="small" variant="outlined" @click="openAddressModal">
            Add address
          </v-btn>
        </div>
        <v-select
          v-model="selectedAddressId"
          :items="addresses"
          item-title="label"
          item-value="id"
          label="Select address"
          variant="outlined"
          class="mb-2"
        />
        <v-text-field v-model="form.shipping_name" label="Full name" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.shipping_line1" label="Address line 1" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.shipping_line2" label="Address line 2" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.shipping_city" label="City" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.shipping_country" label="Country" variant="outlined" />
        <v-select
          v-model="selectedPaymentMethodId"
          :items="paymentMethods"
          item-title="display_name"
          item-value="id"
          label="Payment method *"
          variant="outlined"
          class="mt-3 mb-2"
          :loading="loadingPaymentMethods"
        />
        <p v-if="selectedPaymentMethod?.type === 'wallet'" class="text-caption text-medium-emphasis mb-2">
          Wallet balance: {{ formatPrice(walletBalance) }}
        </p>
        <template v-if="selectedPaymentMethod?.type === 'bank_transfer'">
          <v-alert type="info" variant="tonal" class="mb-2" density="compact">
            Upload bank transfer slip and transaction id.
          </v-alert>
          <v-row class="mb-2">
            <v-col cols="12" class="d-flex justify-center">
              <img
                v-if="selectedPaymentMethodQrUrl"
                :src="selectedPaymentMethodQrUrl"
                alt="Payment QR"
                class="checkout-payment-qr"
              />
              <span v-else class="text-caption text-medium-emphasis">No QR image</span>
            </v-col>
          </v-row>
          <v-text-field
            v-model="bankTransfer.transaction_id"
            label="Transaction ID *"
            variant="outlined"
            class="mb-2"
          />
          <div class="d-flex align-center ga-2 mb-2">
            <input ref="slipInput" type="file" accept="image/jpeg,image/png,image/webp" class="d-none" @change="onSlipSelected">
            <v-btn variant="outlined" :loading="uploadingSlip" @click="slipInput?.click()">
              Upload Slip
            </v-btn>
            <span class="text-caption text-medium-emphasis">
              {{ bankTransfer.slip_path ? 'Slip uploaded' : 'No slip uploaded' }}
            </span>
          </div>
        </template>
        <div class="d-flex align-center ga-2">
          <v-text-field
            v-model="promoCodeInput"
            label="Promo code (optional)"
            variant="outlined"
            class="flex-grow-1"
            placeholder="Enter exact promo code"
            hide-details
          />
          <div class="d-flex align-center ga-2 promo-action-wrap">
            <v-btn color="success" variant="flat" class="promo-action-btn" @click="applyPromoCode">
              Apply
            </v-btn>
            <v-btn color="error" variant="flat" class="promo-action-btn" :disabled="!appliedPromo" @click="clearPromoCode">
              Clear
            </v-btn>
          </div>
        </div>
        <p v-if="appliedPromo" class="text-caption text-success mt-1 mb-0">
          Applied: {{ appliedPromo.name }} ({{ appliedPromo.code }})
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          class="checkout-place-order-btn"
          :disabled="!selectedPaymentMethodId"
          :loading="submitting"
          @click="placeOrder"
        >
          Order Now
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-dialog v-model="showAddressDialog" max-width="520" persistent>
      <v-card>
        <v-card-title>New address</v-card-title>
        <v-card-text>
          <v-text-field v-model="addressForm.label" label="Label (Home/Office)" variant="outlined" class="mb-2" />
          <v-text-field v-model="addressForm.line1" label="Address line 1" variant="outlined" class="mb-2" />
          <v-text-field v-model="addressForm.line2" label="Address line 2" variant="outlined" class="mb-2" />
          <v-select
            v-model="addressForm.country_id"
            :items="countryOptions"
            item-title="name"
            item-value="id"
            label="Country"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
          />
          <v-autocomplete
            v-model="addressForm.state_id"
            :items="regionOptions"
            item-title="name"
            item-value="id"
            label="Region"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
            :disabled="!addressForm.country_id"
            clearable
          />
          <v-autocomplete
            v-model="addressForm.city_id"
            :items="townshipOptions"
            item-title="name"
            item-value="id"
            label="Township"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
            :disabled="!addressForm.state_id"
            clearable
          />
          <v-text-field v-model="addressForm.postal_code" label="Postal code" variant="outlined" class="mb-2" />
          <v-checkbox v-model="addressForm.is_default" label="Set as default" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddressDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingAddress" @click="saveAddress">Save address</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="errorSnack" color="error">
      {{ errorMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const cart = useMemberCart()
const { profile, ensureProfile } = useProfile()
const addresses = ref<any[]>([])
const selectedAddressId = ref<string | null>(null)
const selectedPaymentMethodId = ref<string | null>(null)
const paymentMethods = ref<any[]>([])
const loadingPaymentMethods = ref(false)
const promotions = ref<any[]>([])
const promoCodeInput = ref('')
const appliedPromo = ref<any | null>(null)
const showAddressDialog = ref(false)
const savingAddress = ref(false)
const submitting = ref(false)
const errorSnack = ref(false)
const errorMsg = ref('')
const walletBalance = ref(0)
const slipInput = ref<HTMLInputElement | null>(null)
const uploadingSlip = ref(false)
const initialLoading = ref(true)
const { countries, states, cities, loading: geoLoading, ensureLoaded } = useAddressGeoCache()

const form = reactive({
  shipping_name: '',
  shipping_line1: '',
  shipping_line2: '',
  shipping_city: '',
  shipping_country: 'Myanmar',
})
const addressForm = reactive({
  label: '',
  line1: '',
  line2: '',
  country_id: '',
  state_id: '',
  city_id: '',
  postal_code: '',
  is_default: false,
})
const bankTransfer = reactive({
  transaction_id: '',
  slip_path: '',
})
const selectedCartVariantIds = ref<string[]>([])
const checkoutSelectionActive = ref(false)

const selectedPromo = computed(() => appliedPromo.value)
const selectedCartItems = computed(() =>
  cart.items.value.filter(i => selectedCartVariantIds.value.includes(i.variant_id)),
)
const checkoutSubtotal = computed(() =>
  selectedCartItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0),
)
const allRowsSelected = computed(() =>
  cart.items.value.length > 0 && selectedCartVariantIds.value.length === cart.items.value.length,
)
const someRowsSelected = computed(() =>
  selectedCartVariantIds.value.length > 0 && selectedCartVariantIds.value.length < cart.items.value.length,
)
const countryOptions = computed(() => countries.value)
const regionOptions = computed(() => states.value.filter((x: any) => x.country_id === addressForm.country_id))
const townshipOptions = computed(() => cities.value.filter((x: any) => x.state_id === addressForm.state_id))
const discountTotal = computed(() => {
  const promo = selectedPromo.value
  if (!promo) return 0
  const subtotal = checkoutSubtotal.value
  if (subtotal < Number(promo.min_subtotal ?? 0))
    return 0
  let discount = promo.discount_type === 'percent'
    ? (subtotal * Number(promo.discount_value ?? 0)) / 100
    : Number(promo.discount_value ?? 0)
  if (promo.max_discount != null)
    discount = Math.min(discount, Number(promo.max_discount))
  return Math.max(0, Math.min(discount, subtotal))
})
const finalTotal = computed(() => Math.max(0, checkoutSubtotal.value - discountTotal.value))
const selectedPaymentMethod = computed(() => paymentMethods.value.find((m: any) => m.id === selectedPaymentMethodId.value) ?? null)
const selectedPaymentMethodQrUrl = computed(() => {
  const path = String(selectedPaymentMethod.value?.image_path ?? '').trim()
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
})

function isRowSelected(variantId: string) {
  return selectedCartVariantIds.value.includes(variantId)
}

function toggleRowSelection(variantId: string, checked: boolean | null) {
  const enabled = Boolean(checked)
  if (enabled) {
    if (!selectedCartVariantIds.value.includes(variantId))
      selectedCartVariantIds.value = [...selectedCartVariantIds.value, variantId]
    return
  }
  selectedCartVariantIds.value = selectedCartVariantIds.value.filter(id => id !== variantId)
}

function toggleSelectAll(checked: boolean | null) {
  if (Boolean(checked)) {
    selectedCartVariantIds.value = cart.items.value.map(i => i.variant_id)
    return
  }
  selectedCartVariantIds.value = []
}

async function loadAddresses() {
  const data = await $fetch<any[]>('/api/member/addresses')
  addresses.value = data ?? []
  const def = addresses.value.find(a => a.is_default) ?? addresses.value[0]
  if (def) {
    selectedAddressId.value = def.id
    form.shipping_name = def.label || 'Recipient'
    form.shipping_line1 = def.line1
    form.shipping_line2 = def.line2 ?? ''
    form.shipping_city = def.city
    form.shipping_country = def.country ?? 'Myanmar'
  }
}

async function loadPaymentMethods() {
  loadingPaymentMethods.value = true
  try {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name, type, account_name, account_number, bank_name, image_path, is_active, sort_order')
      .eq('is_active', true)
      .neq('type', 'cash')
      .order('sort_order')
      .order('created_at')
    paymentMethods.value = (data ?? []).map((m: any) => ({
      ...m,
      display_name: m.type === 'bank_transfer'
        ? `${m.name} - ${m.bank_name || ''} ${m.account_number || ''}`.trim()
        : m.name,
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

function applyPromoCode() {
  const code = promoCodeInput.value.trim().toUpperCase()
  if (!code) {
    appliedPromo.value = null
    return
  }
  const promo = promotions.value.find((p: any) => String(p.code ?? '').trim().toUpperCase() === code) ?? null
  if (!promo) {
    appliedPromo.value = null
    errorMsg.value = 'Promo code not found or inactive.'
    errorSnack.value = true
    return
  }
  appliedPromo.value = promo
  promoCodeInput.value = code
}

function clearPromoCode() {
  promoCodeInput.value = ''
  appliedPromo.value = null
}

async function increaseQty(variantId: string, quantity: number) {
  await cart.setQuantity(variantId, Math.max(1, Number(quantity ?? 1) + 1))
}

async function decreaseQty(variantId: string, quantity: number) {
  await cart.setQuantity(variantId, Math.max(0, Number(quantity ?? 1) - 1))
}

async function removeCheckoutItem(variantId: string) {
  await cart.removeItem(variantId)
  selectedCartVariantIds.value = selectedCartVariantIds.value.filter(id => id !== variantId)
}

async function removeSelectedItems() {
  if (!selectedCartVariantIds.value.length)
    return
  const selectedIds = [...selectedCartVariantIds.value]
  await Promise.all(selectedIds.map(variantId => cart.removeItem(variantId)))
  selectedCartVariantIds.value = []
  checkoutSelectionActive.value = false
  clearPromoCode()
}

function startSelectedCheckout() {
  if (!selectedCartVariantIds.value.length) {
    errorMsg.value = 'Please select products to checkout.'
    errorSnack.value = true
    return
  }
  checkoutSelectionActive.value = true
}

function resetAddressForm() {
  addressForm.label = ''
  addressForm.line1 = ''
  addressForm.line2 = ''
  addressForm.country_id = countryOptions.value.find((x: any) => x.code === 'MM')?.id ?? ''
  addressForm.state_id = ''
  addressForm.city_id = ''
  addressForm.postal_code = ''
  addressForm.is_default = false
}

function openAddressModal() {
  resetAddressForm()
  showAddressDialog.value = true
}

async function saveAddress() {
  if (!addressForm.line1 || !addressForm.country_id || !addressForm.state_id || !addressForm.city_id) return
  savingAddress.value = true
  try {
    const data = await $fetch<any>('/api/member/addresses', {
      method: 'POST',
      body: {
        label: addressForm.label || null,
        line1: addressForm.line1,
        line2: addressForm.line2 || null,
        country_id: addressForm.country_id,
        state_id: addressForm.state_id,
        city_id: addressForm.city_id,
        postal_code: addressForm.postal_code || null,
        is_default: addressForm.is_default,
      },
    })
    const createdAddress = data as any
    showAddressDialog.value = false
    await loadAddresses()
    if (createdAddress?.id)
      selectedAddressId.value = createdAddress.id
  }
  finally {
    savingAddress.value = false
  }
}

async function onSlipSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingSlip.value = true
  try {
    const user = useSupabaseUser()
    if (!user.value?.id) throw new Error('Unauthorized')
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.value.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('payment-slips').upload(path, file, { upsert: false })
    if (error) throw error
    bankTransfer.slip_path = path
  }
  catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to upload slip'
    errorSnack.value = true
  }
  finally {
    uploadingSlip.value = false
    input.value = ''
  }
}

watch(selectedAddressId, (id) => {
  const a = addresses.value.find(x => x.id === id)
  if (a) {
    form.shipping_name = a.label || ''
    form.shipping_line1 = a.line1
    form.shipping_line2 = a.line2 ?? ''
    form.shipping_city = a.city
    form.shipping_country = a.country ?? 'Myanmar'
  }
})

watch(selectedPaymentMethodId, () => {
  bankTransfer.transaction_id = ''
  bankTransfer.slip_path = ''
})

watch(() => addressForm.country_id, () => {
  addressForm.state_id = ''
  addressForm.city_id = ''
})

watch(() => addressForm.state_id, () => {
  addressForm.city_id = ''
})

async function placeOrder() {
  if (!checkoutSelectionActive.value || !selectedCartItems.value.length) {
    errorMsg.value = 'Please select products and click Checkout Selected.'
    errorSnack.value = true
    return
  }
  if (!form.shipping_name || !form.shipping_line1 || !form.shipping_city) {
    errorMsg.value = 'Please fill shipping name, address and city.'
    errorSnack.value = true
    return
  }
  if (!selectedPaymentMethodId.value) {
    errorMsg.value = 'Please select payment method.'
    errorSnack.value = true
    return
  }
  if (selectedPaymentMethod.value?.type === 'bank_transfer') {
    if (!bankTransfer.transaction_id.trim() || !bankTransfer.slip_path.trim()) {
      errorMsg.value = 'Bank transfer requires transaction id and slip upload.'
      errorSnack.value = true
      return
    }
  }
  if (selectedPaymentMethod.value?.type === 'wallet' && finalTotal.value > walletBalance.value) {
    errorMsg.value = 'Wallet balance is insufficient.'
    errorSnack.value = true
    return
  }
  submitting.value = true
  errorSnack.value = false
  try {
    const orderedVariantIds = selectedCartItems.value.map(i => i.variant_id)
    const body = {
      payment_method_id: selectedPaymentMethodId.value,
      transaction_id: selectedPaymentMethod.value?.type === 'bank_transfer' ? bankTransfer.transaction_id.trim() : undefined,
      slip_path: selectedPaymentMethod.value?.type === 'bank_transfer' ? bankTransfer.slip_path.trim() : undefined,
      promo_id: appliedPromo.value?.id ?? null,
      items: selectedCartItems.value.map(i => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name: i.variant_name,
        price: i.price,
        quantity: i.quantity,
      })),
      ...form,
    }
    const order = await $fetch<any>('/api/orders', { method: 'POST', body })
    await Promise.all(orderedVariantIds.map(variantId => cart.removeItem(variantId)))
    selectedCartVariantIds.value = []
    checkoutSelectionActive.value = false
    clearPromoCode()
    await navigateTo(`/member/orders/${order.id}`)
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message ?? e?.message ?? 'Order failed'
    errorSnack.value = true
  }
  finally {
    submitting.value = false
  }
}

watch(
  () => cart.items.value.map(i => i.variant_id),
  (variantIds) => {
    selectedCartVariantIds.value = selectedCartVariantIds.value.filter(id => variantIds.includes(id))
    if (checkoutSelectionActive.value && selectedCartVariantIds.value.length === 0) {
      checkoutSelectionActive.value = false
      clearPromoCode()
    }
  },
)

watch(promoCodeInput, (value) => {
  if (!appliedPromo.value) return
  const code = String(value ?? '').trim().toUpperCase()
  const appliedCode = String(appliedPromo.value.code ?? '').trim().toUpperCase()
  if (code !== appliedCode)
    appliedPromo.value = null
})

async function syncCartStockOnEntry() {
  if (!cart.items.value.length)
    return
  try {
    const payload = {
      items: cart.items.value.map(i => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    }
    const result = await $fetch<{ remove_variant_ids?: string[] }>('/api/member/checkout/stock-sync', {
      method: 'POST',
      body: payload,
    })
    const removeIds = (result?.remove_variant_ids ?? []).filter(Boolean)
    if (!removeIds.length)
      return
    await Promise.all(removeIds.map(variantId => cart.removeItem(variantId)))
    selectedCartVariantIds.value = selectedCartVariantIds.value.filter(id => !removeIds.includes(id))
    if (checkoutSelectionActive.value && selectedCartVariantIds.value.length === 0) {
      checkoutSelectionActive.value = false
      clearPromoCode()
    }
  }
  catch {
    // Keep checkout usable even if stock sync request fails.
  }
}

onMounted(async () => {
  try {
    await cart.ensureLoaded()
    await ensureLoaded()
    resetAddressForm()
    await syncCartStockOnEntry()
    await Promise.all([loadAddresses(), loadPaymentMethods(), loadPromotions()])
    await ensureProfile()
    walletBalance.value = Number(profile.value?.wallet_balance ?? 0)
  }
  finally {
    initialLoading.value = false
  }
})
</script>

<style scoped>
.qty-value {
  min-width: 24px;
  text-align: center;
}

.qty-minus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-error));
}

.qty-plus-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-success));
}

.checkout-table {
  table-layout: fixed;
}

.checkout-table th,
.checkout-table td {
  white-space: nowrap;
}

.checkout-table .col-select {
  width: 56px;
}

.checkout-table .col-product {
  width: 240px;
}

.checkout-table .col-variant {
  width: 180px;
}

.checkout-table .col-price {
  width: 140px;
}

.checkout-table .col-qty {
  width: 110px;
}

.checkout-table .col-total {
  width: 140px;
}

.checkout-table .col-action {
  width: 64px;
}

.checkout-payment-qr {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
}

.promo-action-wrap {
  align-self: center;
}

.promo-action-btn {
  align-self: center;
}

.checkout-place-order-btn {
  height: 56px;
  min-width: 180px;
}
</style>
