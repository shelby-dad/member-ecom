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
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const supabase = useSupabaseClient()
const orders = ref<any[]>([])

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}
function statusColor(s: string) {
  const m: Record<string, string> = { pending: 'warning', confirmed: 'info', processing: 'primary', shipped: 'secondary', delivered: 'success', cancelled: 'error' }
  return m[s] ?? 'default'
}

async function load() {
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  orders.value = data ?? []
}

onMounted(load)
</script>
