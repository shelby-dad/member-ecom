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
            <v-autocomplete
              v-model="selectedMember"
              :items="members"
              item-title="email"
              item-value="id"
              label="Select member"
              variant="outlined"
              :loading="loadingMembers"
              @update:model-value="onSelectMember"
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(i, idx) in posCart" :key="idx">
                  <td>{{ i.variant_name }}</td>
                  <td>{{ formatPrice(i.price) }}</td>
                  <td>{{ i.quantity }}</td>
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
            <p v-if="posCart.length" class="mt-2">
              <strong>Total: {{ formatPrice(posTotal) }}</strong>
            </p>
            <v-btn color="primary" class="mt-2" :disabled="!selectedMember || !posCart.length" :loading="creating" @click="createOrder">
              Complete sale
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Products</v-card-title>
          <v-card-text>
            <v-text-field v-model="productSearch" label="Search" variant="outlined" density="comfortable" hide-details class="mb-2" />
            <v-table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in filteredVariants" :key="v.id">
                  <td>{{ v.products?.name }}</td>
                  <td>{{ v.name }}</td>
                  <td>{{ formatPrice(v.price) }}</td>
                  <td>
                    <v-btn size="small" color="primary" @click="addToPosCart(v)">
                      Add
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snack" :color="snackSuccess ? 'success' : 'error'">
      {{ snackMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: 'role' })

const supabase = useSupabaseClient()
const members = ref<any[]>([])
const loadingMembers = ref(false)
const selectedMember = ref<string | null>(null)
const selectedMemberProfile = ref<any>(null)
const productSearch = ref('')
const variants = ref<any[]>([])
const posCart = ref<Array<{ variant_id: string; product_name: string; variant_name: string; price: number; quantity: number }>>([])
const creating = ref(false)
const snack = ref(false)
const snackSuccess = ref(false)
const snackMsg = ref('')

const posTotal = computed(() => posCart.value.reduce((s, i) => s + i.price * i.quantity, 0))

const filteredVariants = computed(() => {
  const q = productSearch.value.toLowerCase()
  if (!q) return variants.value
  return variants.value.filter(v =>
    (v.products?.name?.toLowerCase().includes(q)) || v.name?.toLowerCase().includes(q),
  )
})

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    const data = await $fetch<any[]>('/api/pos/members')
    members.value = data ?? []
  }
  finally {
    loadingMembers.value = false
  }
}

function onSelectMember(id: string | null) {
  if (!id) {
    selectedMemberProfile.value = null
    return
  }
  selectedMemberProfile.value = members.value.find(m => m.id === id) ?? null
}

async function loadVariants() {
  const { data } = await supabase.from('product_variants').select('*, products(name)').order('products(name)')
  variants.value = data ?? []
}

function addToPosCart(v: any) {
  const existing = posCart.value.find(i => i.variant_id === v.id)
  if (existing)
    existing.quantity += 1
  else
    posCart.value.push({ variant_id: v.id, product_name: v.products?.name ?? '', variant_name: v.name, price: v.price, quantity: 1 })
}

function removePosItem(idx: number) {
  posCart.value.splice(idx, 1)
}

async function createOrder() {
  if (!selectedMember.value || !posCart.value.length) return
  creating.value = true
  snack.value = false
  try {
    const body = {
      user_id: selectedMember.value,
      items: posCart.value.map(i => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name: i.variant_name,
        price: i.price,
        quantity: i.quantity,
      })),
    }
    await $fetch('/api/pos/orders', { method: 'POST', body })
    snackMsg.value = 'Order created.'
    snackSuccess.value = true
    snack.value = true
    posCart.value = []
  }
  catch (e: any) {
    snackMsg.value = e?.data?.message ?? e?.message ?? 'Failed'
    snackSuccess.value = false
    snack.value = true
  }
  finally {
    creating.value = false
  }
}

onMounted(() => {
  loadMembers()
  loadVariants()
})
</script>
