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
        <strong>Total: {{ formatPrice(cart.total.value) }}</strong>
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
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" :loading="submitting" @click="placeOrder">
          Place order
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-snackbar v-model="errorSnack" color="error">
      {{ errorMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })

const supabase = useSupabaseClient()
const cart = useCart()
const addresses = ref<any[]>([])
const selectedAddressId = ref<string | null>(null)
const submitting = ref(false)
const errorSnack = ref(false)
const errorMsg = ref('')

const form = reactive({
  shipping_name: '',
  shipping_line1: '',
  shipping_line2: '',
  shipping_city: '',
  shipping_country: 'TH',
})

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}

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

async function placeOrder() {
  if (!form.shipping_name || !form.shipping_line1 || !form.shipping_city) {
    errorMsg.value = 'Please fill shipping name, address and city.'
    errorSnack.value = true
    return
  }
  submitting.value = true
  errorSnack.value = false
  try {
    const body = {
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
</script>
