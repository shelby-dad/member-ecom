<template>
  <div>
    <h1 class="text-h4 mb-4">
      Addresses
    </h1>
    <v-btn color="primary" class="mb-4" @click="showForm = true; editingId = null; resetForm()">
      Add address
    </v-btn>
    <v-table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Address</th>
          <th>Default</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in addresses" :key="a.id">
          <td>{{ a.label || '–' }}</td>
          <td>{{ a.line1 }}, {{ a.city }} {{ a.postal_code || '' }}</td>
          <td>{{ a.is_default ? 'Yes' : 'No' }}</td>
          <td>
            <v-btn size="small" variant="text" @click="edit(a)">Edit</v-btn>
            <v-btn size="small" variant="text" color="error" @click="remove(a.id)">Delete</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-dialog v-model="showForm" max-width="500" persistent>
      <v-card>
        <v-card-title>{{ editingId ? 'Edit address' : 'New address' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.label" label="Label (e.g. Home)" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.line1" label="Address line 1" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.line2" label="Address line 2" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.city" label="City" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.state" label="State" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.postal_code" label="Postal code" variant="outlined" class="mb-2" />
          <v-text-field v-model="form.country" label="Country" variant="outlined" class="mb-2" />
          <v-checkbox v-model="form.is_default" label="Default address" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })

const addresses = ref<any[]>([])
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'TH',
  is_default: false,
})

function resetForm() {
  form.label = ''
  form.line1 = ''
  form.line2 = ''
  form.city = ''
  form.state = ''
  form.postal_code = ''
  form.country = 'TH'
  form.is_default = false
}

async function load() {
  const data = await $fetch<any[]>('/api/member/addresses')
  addresses.value = data ?? []
}

function edit(a: any) {
  editingId.value = a.id
  form.label = a.label ?? ''
  form.line1 = a.line1
  form.line2 = a.line2 ?? ''
  form.city = a.city
  form.state = a.state ?? ''
  form.postal_code = a.postal_code ?? ''
  form.country = a.country ?? 'TH'
  form.is_default = a.is_default ?? false
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/member/addresses/${editingId.value}`, {
        method: 'PUT',
        body: {
          label: form.label || null,
          line1: form.line1,
          line2: form.line2 || null,
          city: form.city,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country,
          is_default: form.is_default,
        },
      })
    }
    else {
      await $fetch('/api/member/addresses', {
        method: 'POST',
        body: {
        label: form.label || null,
        line1: form.line1,
        line2: form.line2 || null,
        city: form.city,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country,
        is_default: form.is_default,
        },
      })
    }
    showForm.value = false
    editingId.value = null
    resetForm()
    await load()
  }
  finally {
    saving.value = false
  }
}

async function remove(id: string) {
  await $fetch(`/api/member/addresses/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
