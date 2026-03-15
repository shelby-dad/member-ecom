<template>
  <div>
    <h1 class="text-h4 mb-4">
      Orders
    </h1>
    <v-table>
      <thead>
        <tr>
          <th>Order #</th>
          <th>Status</th>
          <th>Total</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in orders" :key="o.id">
          <td>{{ o.order_number }}</td>
          <td>
            <v-chip size="small" :color="statusColor(o.status)">{{ o.status }}</v-chip>
          </td>
          <td>{{ formatPrice(o.total) }}</td>
          <td>{{ formatDate(o.created_at) }}</td>
          <td>
            <v-btn size="small" variant="text" :to="`/admin/orders/${o.id}`">View</v-btn>
            <v-btn
              size="small"
              variant="text"
              color="error"
              :loading="deletingId === o.id"
              @click="openDeleteDialog(o)"
            >
              Delete
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm order deletion</v-card-title>
        <v-card-text>
          This is a soft delete. Order
          <strong v-if="selectedOrder"> {{ selectedOrder.order_number }}</strong>
          will be marked deleted and hidden from order lists.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deletingId !== null" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" :disabled="!selectedOrder" :loading="deletingId === selectedOrder?.id" @click="confirmDelete">
            Confirm delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const supabase = useSupabaseClient()
const orders = ref<any[]>([])
const showDeleteDialog = ref(false)
const selectedOrder = ref<any | null>(null)
const deletingId = ref<string | null>(null)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}
function statusColor(s: string) {
  const m: Record<string, string> = { pending: 'warning', confirmed: 'info', processing: 'primary', shipped: 'secondary', delivered: 'success', cancelled: 'error' }
  return m[s] ?? 'default'
}

async function load() {
  const withSoftDelete = await supabase
    .from('orders')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!withSoftDelete.error) {
    orders.value = withSoftDelete.data ?? []
    return
  }

  // Backward-compatible fallback when deleted_at migration is not applied yet.
  if (withSoftDelete.error.message.includes('deleted_at')) {
    const legacy = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    orders.value = legacy.data ?? []
    return
  }

  throw withSoftDelete.error
}

function openDeleteDialog(order: any) {
  selectedOrder.value = order
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedOrder.value?.id)
    return
  deletingId.value = selectedOrder.value.id
  try {
    await $fetch(`/api/admin/orders/${selectedOrder.value.id}`, { method: 'DELETE' })
    showDeleteDialog.value = false
    selectedOrder.value = null
    await load()
  }
  finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>
