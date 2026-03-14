<template>
  <div v-if="order">
    <h1 class="text-h4 mb-4">
      Order {{ order.order_number }}
    </h1>
    <v-card class="mb-4">
      <v-card-text>
        <p><strong>Status:</strong> {{ order.status }}</p>
        <p><strong>Total:</strong> {{ formatPrice(order.total) }}</p>
        <p><strong>Date:</strong> {{ formatDate(order.created_at) }}</p>
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Items</v-card-title>
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
          <tr v-for="i in orderItems" :key="i.id">
            <td>{{ i.product_name }}</td>
            <td>{{ i.variant_name }}</td>
            <td>{{ formatPrice(i.price) }}</td>
            <td>{{ i.quantity }}</td>
            <td>{{ formatPrice(i.total) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <v-card v-if="order.status === 'pending' && paymentMethods.length" class="mb-4">
      <v-card-title>Submit payment proof</v-card-title>
      <v-card-text>
        <v-select v-model="submission.payment_method_id" :items="paymentMethods" item-title="name" item-value="id" label="Payment method" variant="outlined" class="mb-2" />
        <v-text-field v-model="submission.transaction_id" label="Transaction ID" variant="outlined" class="mb-2" />
        <v-btn color="primary" :loading="submitting" @click="submitPayment">
          Submit
        </v-btn>
      </v-card-text>
    </v-card>
    <v-snackbar v-model="snack" :color="snackSuccess ? 'success' : 'error'">
      {{ snackMsg }}
    </v-snackbar>
  </div>
  <div v-else class="text-center py-8">
    <v-progress-circular indeterminate />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })

const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const order = ref<any>(null)
const orderItems = ref<any[]>([])
const paymentMethods = ref<any[]>([])
const submitting = ref(false)
const snack = ref(false)
const snackSuccess = ref(false)
const snackMsg = ref('')
const submission = reactive({ payment_method_id: '', transaction_id: '' })

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

async function load() {
  const { data: o } = await supabase.from('orders').select('*').eq('id', id).single()
  order.value = o ?? null
  if (o) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id)
    orderItems.value = items ?? []
  }
  const { data: pm } = await supabase.from('payment_methods').select('*').eq('is_active', true)
  paymentMethods.value = pm ?? []
}

async function submitPayment() {
  if (!submission.payment_method_id || !user.value) return
  submitting.value = true
  try {
    await supabase.from('payment_submissions').insert({
      order_id: id,
      payment_method_id: submission.payment_method_id,
      user_id: user.value.id,
      amount: order.value!.total,
      transaction_id: submission.transaction_id || null,
      status: 'pending',
    } as any)
    snackMsg.value = 'Payment submitted. We will verify shortly.'
    snackSuccess.value = true
    snack.value = true
    submission.transaction_id = ''
    await load()
  }
  catch (e: any) {
    snackMsg.value = e?.message ?? 'Failed'
    snackSuccess.value = false
    snack.value = true
  }
  finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
