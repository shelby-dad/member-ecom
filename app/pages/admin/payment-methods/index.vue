<template>
  <div>
    <h1 class="text-h4 mb-4">
      Payment methods
    </h1>
    <v-btn color="primary" class="mb-4" @click="showCreate = true">
      Add payment method
    </v-btn>
    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Account name</th>
          <th>Account number</th>
          <th>Bank</th>
          <th>Active</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pm in methods" :key="pm.id">
          <td>{{ pm.name }}</td>
          <td class="text-capitalize">{{ pm.type?.replace('_', ' ') }}</td>
          <td>{{ pm.account_name || '–' }}</td>
          <td>{{ pm.account_number || '–' }}</td>
          <td>{{ pm.bank_name || '–' }}</td>
          <td>{{ pm.is_active ? 'Yes' : 'No' }}</td>
        </tr>
      </tbody>
    </v-table>
    <v-dialog v-model="showCreate" max-width="500" persistent>
      <v-card>
        <v-card-title>New payment method</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.type"
            :items="typeOptions"
            label="Type"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field v-model="form.name" label="Name (e.g. Bank Transfer)" variant="outlined" class="mb-2" />
          <v-text-field
            v-if="form.type === 'bank_transfer'"
            v-model="form.account_name"
            label="Account name"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-if="form.type === 'bank_transfer'"
            v-model="form.account_number"
            label="Account number"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field v-if="form.type === 'bank_transfer'" v-model="form.bank_name" label="Bank name" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreate = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="create">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const supabase = useSupabaseClient()
const methods = ref<any[]>([])
const showCreate = ref(false)
const saving = ref(false)
const typeOptions = [
  { title: 'Wallet', value: 'wallet' },
  { title: 'Bank Transfer', value: 'bank_transfer' },
  { title: 'Cash', value: 'cash' },
  { title: 'Cash on Delivery', value: 'cod' },
]
const form = reactive({ type: 'bank_transfer', name: '', account_name: '', account_number: '', bank_name: '' })

async function load() {
  const { data } = await supabase.from('payment_methods').select('*').order('sort_order')
  methods.value = data ?? []
}

async function create() {
  if (!form.name.trim()) return
  if (form.type === 'bank_transfer' && (!form.account_name.trim() || !form.account_number.trim()))
    return
  saving.value = true
  try {
    await $fetch('/api/admin/payment-methods', { method: 'POST', body: { ...form } })
    showCreate.value = false
    form.type = 'bank_transfer'
    form.name = ''
    form.account_name = ''
    form.account_number = ''
    form.bank_name = ''
    await load()
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>
