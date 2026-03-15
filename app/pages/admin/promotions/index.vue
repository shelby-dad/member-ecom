<template>
  <div>
    <h1 class="text-h4 mb-4">
      Promotions
    </h1>
    <v-btn color="primary" class="mb-4" @click="openForm()">
      Add promo package
    </v-btn>
    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Code</th>
          <th>Type</th>
          <th>Value</th>
          <th>Min subtotal</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in promotions" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.code || '-' }}</td>
          <td>{{ p.discount_type }}</td>
          <td>{{ p.discount_type === 'percent' ? `${p.discount_value}%` : formatPrice(p.discount_value) }}</td>
          <td>{{ formatPrice(p.min_subtotal || 0) }}</td>
          <td>{{ p.is_active ? 'Yes' : 'No' }}</td>
          <td>
            <v-btn size="small" variant="text" @click="openForm(p)">Edit</v-btn>
            <v-btn size="small" color="error" variant="text" @click="deactivate(p.id)">Deactivate</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="showForm" max-width="700" persistent>
      <v-card>
        <v-card-title>{{ editingId ? 'Edit promo package' : 'New promo package' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.name" label="Name" variant="outlined" class="mb-2" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.code" label="Code (optional)" variant="outlined" class="mb-2" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="form.description" label="Description" variant="outlined" rows="2" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="form.discount_type"
                :items="[{ title: 'Fixed', value: 'fixed' }, { title: 'Percent', value: 'percent' }]"
                item-title="title"
                item-value="value"
                label="Discount type"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.discount_value" type="number" min="0.01" step="0.01" label="Discount value" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.min_subtotal" type="number" min="0" step="0.01" label="Min subtotal" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.max_discount" type="number" min="0" step="0.01" label="Max discount (optional)" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.usage_limit" type="number" min="1" label="Usage limit (optional)" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.per_user_limit" type="number" min="1" label="Per user limit (optional)" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.starts_at" type="datetime-local" label="Start date/time" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.ends_at" type="datetime-local" label="End date/time" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-checkbox v-model="form.is_active" label="Active" />
            </v-col>
          </v-row>
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
definePageMeta({ layout: 'admin', middleware: 'role' })
const { formatPrice } = usePricingFormat()

const promotions = ref<any[]>([])
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({
  name: '',
  code: '',
  description: '',
  discount_type: 'fixed' as 'fixed' | 'percent',
  discount_value: 0,
  min_subtotal: 0,
  max_discount: null as number | null,
  starts_at: '',
  ends_at: '',
  usage_limit: null as number | null,
  per_user_limit: null as number | null,
  is_active: true,
})

function toIsoOrNull(localValue: string) {
  if (!localValue) return null
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toLocalDatetime(iso?: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function resetForm() {
  form.name = ''
  form.code = ''
  form.description = ''
  form.discount_type = 'fixed'
  form.discount_value = 0
  form.min_subtotal = 0
  form.max_discount = null
  form.starts_at = ''
  form.ends_at = ''
  form.usage_limit = null
  form.per_user_limit = null
  form.is_active = true
}

function openForm(item?: any) {
  if (!item) {
    editingId.value = null
    resetForm()
    showForm.value = true
    return
  }
  editingId.value = item.id
  form.name = item.name
  form.code = item.code ?? ''
  form.description = item.description ?? ''
  form.discount_type = item.discount_type
  form.discount_value = Number(item.discount_value ?? 0)
  form.min_subtotal = Number(item.min_subtotal ?? 0)
  form.max_discount = item.max_discount == null ? null : Number(item.max_discount)
  form.starts_at = toLocalDatetime(item.starts_at)
  form.ends_at = toLocalDatetime(item.ends_at)
  form.usage_limit = item.usage_limit == null ? null : Number(item.usage_limit)
  form.per_user_limit = item.per_user_limit == null ? null : Number(item.per_user_limit)
  form.is_active = item.is_active ?? true
  showForm.value = true
}

async function load() {
  promotions.value = await $fetch<any[]>('/api/admin/promotions')
}

async function save() {
  if (!form.name.trim() || Number(form.discount_value) <= 0) return
  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_subtotal: Number(form.min_subtotal) || 0,
      max_discount: form.max_discount == null || Number.isNaN(Number(form.max_discount)) ? null : Number(form.max_discount),
      starts_at: toIsoOrNull(form.starts_at),
      ends_at: toIsoOrNull(form.ends_at),
      usage_limit: form.usage_limit == null || Number.isNaN(Number(form.usage_limit)) ? null : Number(form.usage_limit),
      per_user_limit: form.per_user_limit == null || Number.isNaN(Number(form.per_user_limit)) ? null : Number(form.per_user_limit),
      is_active: form.is_active,
    }
    if (editingId.value)
      await $fetch(`/api/admin/promotions/${editingId.value}`, { method: 'PUT', body })
    else
      await $fetch('/api/admin/promotions', { method: 'POST', body })

    showForm.value = false
    editingId.value = null
    resetForm()
    await load()
  }
  finally {
    saving.value = false
  }
}

async function deactivate(id: string) {
  await $fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
