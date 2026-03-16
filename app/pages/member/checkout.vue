<template>
  <div>
    <h1 class="text-h4 mb-4">
      Checkout
    </h1>
    <v-card v-if="cart.items.value.length" class="mb-4">
      <v-card-title>Order summary</v-card-title>
      <v-table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in cart.items.value" :key="i.variant_id">
            <td>{{ i.product_name }}</td>
            <td>{{ i.variant_name }}</td>
            <td>{{ formatPrice(i.price) }}</td>
            <td>{{ i.quantity }}</td>
            <td>{{ formatPrice(i.price * i.quantity) }}</td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-medium-emphasis">Subtotal</span>
          <strong>{{ formatPrice(cart.total.value) }}</strong>
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
    <v-card v-if="cart.items.value.length">
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
          />
          <v-btn variant="outlined" @click="applyPromoCode">
            Apply
          </v-btn>
          <v-btn variant="text" :disabled="!appliedPromo" @click="clearPromoCode">
            Clear
          </v-btn>
        </div>
        <p v-if="appliedPromo" class="text-caption text-success mt-1 mb-0">
          Applied: {{ appliedPromo.name }} ({{ appliedPromo.code }})
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" :disabled="!selectedPaymentMethodId" :loading="submitting" @click="placeOrder">
          Place order
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
          <v-text-field v-model="addressForm.city" label="City" variant="outlined" class="mb-2" />
          <v-text-field v-model="addressForm.state" label="State" variant="outlined" class="mb-2" />
          <v-text-field v-model="addressForm.postal_code" label="Postal code" variant="outlined" class="mb-2" />
          <v-text-field v-model="addressForm.country" label="Country" variant="outlined" class="mb-2" />
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
const cart = useCart()
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

const form = reactive({
  shipping_name: '',
  shipping_line1: '',
  shipping_line2: '',
  shipping_city: '',
  shipping_country: 'TH',
})
const addressForm = reactive({
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'TH',
  is_default: false,
})
const bankTransfer = reactive({
  transaction_id: '',
  slip_path: '',
})

const selectedPromo = computed(() => appliedPromo.value)
const discountTotal = computed(() => {
  const promo = selectedPromo.value
  if (!promo) return 0
  const subtotal = cart.total.value
  if (subtotal < Number(promo.min_subtotal ?? 0))
    return 0
  let discount = promo.discount_type === 'percent'
    ? (subtotal * Number(promo.discount_value ?? 0)) / 100
    : Number(promo.discount_value ?? 0)
  if (promo.max_discount != null)
    discount = Math.min(discount, Number(promo.max_discount))
  return Math.max(0, Math.min(discount, subtotal))
})
const finalTotal = computed(() => Math.max(0, cart.total.value - discountTotal.value))
const selectedPaymentMethod = computed(() => paymentMethods.value.find((m: any) => m.id === selectedPaymentMethodId.value) ?? null)

async function loadAddresses() {
  const { data } = await supabase.from('addresses').select('*').order('is_default', { ascending: false })
  addresses.value = data ?? []
  const def = addresses.value.find(a => a.is_default) ?? addresses.value[0]
  if (def) {
    selectedAddressId.value = def.id
    form.shipping_name = def.label || 'Recipient'
    form.shipping_line1 = def.line1
    form.shipping_line2 = def.line2 ?? ''
    form.shipping_city = def.city
    form.shipping_country = def.country ?? 'TH'
  }
}

async function loadPaymentMethods() {
  loadingPaymentMethods.value = true
  try {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name, type, account_name, account_number, bank_name, is_active, sort_order')
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

function resetAddressForm() {
  addressForm.label = ''
  addressForm.line1 = ''
  addressForm.line2 = ''
  addressForm.city = ''
  addressForm.state = ''
  addressForm.postal_code = ''
  addressForm.country = 'TH'
  addressForm.is_default = false
}

function openAddressModal() {
  resetAddressForm()
  showAddressDialog.value = true
}

async function saveAddress() {
  const user = useSupabaseUser()
  if (!user.value?.id || !addressForm.line1 || !addressForm.city) return
  savingAddress.value = true
  try {
    const { data } = await supabase
      .from('addresses')
      .insert({
        user_id: user.value.id,
        label: addressForm.label || null,
        line1: addressForm.line1,
        line2: addressForm.line2 || null,
        city: addressForm.city,
        state: addressForm.state || null,
        postal_code: addressForm.postal_code || null,
        country: addressForm.country || 'TH',
        is_default: addressForm.is_default,
      } as any)
      .select('*')
      .single()
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
    form.shipping_country = a.country ?? 'TH'
  }
})

watch(selectedPaymentMethodId, () => {
  bankTransfer.transaction_id = ''
  bankTransfer.slip_path = ''
})

async function placeOrder() {
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
    const body = {
      payment_method_id: selectedPaymentMethodId.value,
      transaction_id: selectedPaymentMethod.value?.type === 'bank_transfer' ? bankTransfer.transaction_id.trim() : undefined,
      slip_path: selectedPaymentMethod.value?.type === 'bank_transfer' ? bankTransfer.slip_path.trim() : undefined,
      promo_id: appliedPromo.value?.id ?? null,
      items: cart.items.value.map(i => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name: i.variant_name,
        price: i.price,
        quantity: i.quantity,
      })),
      ...form,
    }
    const order = await $fetch<any>('/api/orders', { method: 'POST', body })
    cart.clear()
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

onMounted(loadAddresses)
onMounted(loadPaymentMethods)
onMounted(loadPromotions)

watch(promoCodeInput, (value) => {
  if (!appliedPromo.value) return
  const code = String(value ?? '').trim().toUpperCase()
  const appliedCode = String(appliedPromo.value.code ?? '').trim().toUpperCase()
  if (code !== appliedCode)
    appliedPromo.value = null
})
onMounted(async () => {
  await ensureProfile()
  walletBalance.value = Number(profile.value?.wallet_balance ?? 0)
})
</script>
