<template>
  <div v-if="order">
    <h1 class="text-h4 mb-4">
      Order {{ order.order_number }}
    </h1>
    <v-card class="mb-4">
      <v-card-title>Status</v-card-title>
      <v-card-text>
        <v-select
          v-model="order.status"
          :items="['pending','confirmed','processing','shipped','delivered','cancelled']"
          label="Status"
          variant="outlined"
          @update:model-value="updateStatus"
        />
        <v-btn color="error" variant="outlined" class="mt-3" :loading="deleting" @click="showDeleteDialog = true">
          Delete order
        </v-btn>
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
      <v-card-text>
        <strong>Total: {{ formatPrice(order.total) }}</strong>
      </v-card-text>
    </v-card>
    <v-card v-if="submissions.length">
      <v-card-title>Payment submissions</v-card-title>
      <v-table>
        <thead>
          <tr>
            <th>Amount</th>
            <th>Transaction ID</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in submissions" :key="s.id">
            <td>{{ formatPrice(s.amount) }}</td>
            <td>{{ s.transaction_id || '–' }}</td>
            <td>{{ s.status }}</td>
            <td>
              <v-btn v-if="s.status === 'pending'" size="small" color="success" class="me-1" @click="verify(s.id, 'verified')">Verify</v-btn>
              <v-btn v-if="s.status === 'pending'" size="small" color="error" @click="verify(s.id, 'rejected')">Reject</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm order deletion</v-card-title>
        <v-card-text>
          This is a soft delete. Order <strong>{{ order.order_number }}</strong> will be marked deleted and removed from order screens.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleting" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteOrder">Confirm delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <div v-else class="text-center py-8">
    <v-progress-circular indeterminate />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const route = useRoute()
const id = route.params.id as string
const supabase = useSupabaseClient()
const order = ref<any>(null)
const orderItems = ref<any[]>([])
const submissions = ref<any[]>([])
const showDeleteDialog = ref(false)
const deleting = ref(false)

async function load() {
  const softDeleteQuery = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  let o = softDeleteQuery.data
  if (softDeleteQuery.error?.message.includes('deleted_at')) {
    const legacyQuery = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()
    o = legacyQuery.data
  }

  order.value = o ?? null
  if (o) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id)
    orderItems.value = items ?? []
    const { data: sub } = await supabase.from('payment_submissions').select('*').eq('order_id', id)
    submissions.value = sub ?? []
  }
  else {
    await navigateTo('/admin/orders', { replace: true })
  }
}

async function updateStatus() {
  if (!order.value) return
  await $fetch(`/api/admin/orders/${id}/status`, { method: 'PUT', body: { status: order.value.status } })
}

async function verify(subId: string, status: 'verified' | 'rejected') {
  await $fetch(`/api/admin/payment-submissions/${subId}/verify`, { method: 'PUT', body: { status } })
  await load()
}

async function deleteOrder() {
  if (!order.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    await navigateTo('/admin/orders', { replace: true })
  }
  finally {
    deleting.value = false
    showDeleteDialog.value = false
  }
}

onMounted(load)
</script>
