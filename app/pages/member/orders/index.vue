<template>
  <div>
    <h1 class="text-h4 mb-4">
      My orders
    </h1>
    <v-table>
      <thead>
        <tr>
          <th>Order #</th>
          <th>Status</th>
          <th>Total</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in orders" :key="o.id">
          <td>{{ o.order_number }}</td>
          <td>
            <v-chip size="small">{{ o.status }}</v-chip>
          </td>
          <td>{{ formatPrice(o.total) }}</td>
          <td>{{ formatDate(o.created_at) }}</td>
          <td>
            <v-btn size="small" variant="text" :to="`/member/orders/${o.id}`">View</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <p v-if="orders.length === 0" class="text-medium-emphasis">
      No orders yet.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const orders = ref<any[]>([])

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

async function load() {
  if (!user.value?.id) return
  const { data } = await supabase.from('orders').select('*').eq('user_id', user.value.id).order('created_at', { ascending: false })
  orders.value = data ?? []
}

onMounted(load)
</script>
