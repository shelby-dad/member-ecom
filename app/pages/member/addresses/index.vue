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
          <v-select
            v-model="form.country_id"
            :items="countryOptions"
            item-title="name"
            item-value="id"
            label="Country"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
          />
          <v-select
            v-model="form.state_id"
            :items="regionOptions"
            item-title="name"
            item-value="id"
            label="Region"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
            :disabled="!form.country_id"
          />
          <v-select
            v-model="form.city_id"
            :items="townshipOptions"
            item-title="name"
            item-value="id"
            label="Township"
            variant="outlined"
            class="mb-2"
            :loading="geoLoading"
            :disabled="!form.state_id"
          />
          <v-text-field v-model="form.postal_code" label="Postal code" variant="outlined" class="mb-2" />
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
const { countries, states, cities, loading: geoLoading, ensureLoaded } = useAddressGeoCache()
const form = reactive({
  label: '',
  line1: '',
  line2: '',
  country_id: '',
  state_id: '',
  city_id: '',
  postal_code: '',
  is_default: false,
})

const countryOptions = computed(() => countries.value)
const regionOptions = computed(() => states.value.filter((x: any) => x.country_id === form.country_id))
const townshipOptions = computed(() => cities.value.filter((x: any) => x.state_id === form.state_id))

function resetForm() {
  form.label = ''
  form.line1 = ''
  form.line2 = ''
  form.country_id = countryOptions.value.find((x: any) => x.code === 'MM')?.id ?? ''
  form.state_id = ''
  form.city_id = ''
  form.postal_code = ''
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
  const country = countries.value.find((x: any) => x.id === a.country_id) ?? countries.value.find((x: any) => x.name === a.country)
  form.country_id = country?.id ?? countryOptions.value.find((x: any) => x.code === 'MM')?.id ?? ''
  const state = states.value.find((x: any) => x.id === a.state_id) ?? states.value.find((x: any) => x.country_id === form.country_id && x.name === a.state)
  form.state_id = state?.id ?? ''
  const city = cities.value.find((x: any) => x.id === a.city_id) ?? cities.value.find((x: any) => x.state_id === form.state_id && x.name === a.city)
  form.city_id = city?.id ?? ''
  form.postal_code = a.postal_code ?? ''
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
          country_id: form.country_id,
          state_id: form.state_id,
          city_id: form.city_id,
          postal_code: form.postal_code || null,
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
        country_id: form.country_id,
        state_id: form.state_id,
        city_id: form.city_id,
        postal_code: form.postal_code || null,
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

watch(() => form.country_id, () => {
  form.state_id = ''
  form.city_id = ''
})

watch(() => form.state_id, () => {
  form.city_id = ''
})

onMounted(async () => {
  await ensureLoaded()
  resetForm()
  await load()
})
</script>
