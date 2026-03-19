<template>
  <div v-if="loading">
    <v-card class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="heading" class="mb-3" />
        <v-skeleton-loader type="paragraph" />
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-text>
        <v-skeleton-loader type="table-heading" class="mb-2" />
        <v-skeleton-loader v-for="n in 4" :key="`detail-item-skeleton-${n}`" type="table-row-divider" class="mb-1" />
      </v-card-text>
    </v-card>
  </div>
  <div v-else-if="order">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
      <h1 class="text-h4">
        Order {{ order.order_number }}
      </h1>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-file-download-outline"
        :to="`/print/invoice/${id}?from=member`"
      >
        Download Invoice
      </v-btn>
    </div>
    <v-card class="mb-4">
      <v-card-text>
        <p><strong>Status:</strong> {{ order.status }}</p>
        <p><strong>Payment method:</strong> {{ formatPaymentMethod(order.payment_method_type) }}</p>
        <p><strong>Payment status:</strong> {{ formatTextOrDash(order.payment_status) }}</p>
        <p><strong>Estimate delivery:</strong> {{ formatEstimateRange(order.estimate_delivery_start, order.estimate_delivery_end) }}</p>
        <p><strong>Discount Amount:</strong> {{ formatDiscount(order.discount_total) }}</p>
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
  <div v-else class="text-center py-8 text-medium-emphasis">
    Order not found.
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const route = useRoute()
const id = route.params.id as string
const loading = ref(true)
const order = ref<any>(null)
const orderItems = ref<any[]>([])
const paymentMethods = ref<any[]>([])
const submitting = ref(false)
const snack = ref(false)
const snackSuccess = ref(false)
const snackMsg = ref('')
const submission = reactive({ payment_method_id: '', transaction_id: '' })

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

function formatTextOrDash(value: string | null | undefined) {
  return value ? value : '-'
}

function formatPaymentMethod(value: string | null | undefined) {
  if (!value) return '-'
  if (value === 'bank_transfer') return 'Bank Transfer'
  if (value === 'cod') return 'Cash on Delivery'
  if (value === 'wallet') return 'Wallet'
  return value
}

function formatEstimateRange(start: string | null | undefined, end: string | null | undefined) {
  const fmt = (v: string) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(v))
  if (start && end) return `${fmt(start)} - ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return '-'
}

function formatDiscount(value: unknown) {
  const n = Number(value ?? 0)
  if (!n)
    return '-'
  return formatPrice(n)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ order: any, items: any[], paymentMethods: any[] }>(`/api/member/orders/${id}`)
    order.value = data.order ?? null
    orderItems.value = data.items ?? []
    paymentMethods.value = data.paymentMethods ?? []
  }
  finally {
    loading.value = false
  }
}

async function submitPayment() {
  if (!submission.payment_method_id || !order.value) return
  submitting.value = true
  try {
    await $fetch(`/api/member/orders/${id}/payment-submissions`, {
      method: 'POST',
      body: {
        payment_method_id: submission.payment_method_id,
        transaction_id: submission.transaction_id || null,
      },
    })
    snackMsg.value = 'Payment submitted. We will verify shortly.'
    snackSuccess.value = true
    snack.value = true
    submission.payment_method_id = ''
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
