<template>
  <div v-if="product">
    <h1 class="text-h4 mb-4">
      {{ product.name }}
    </h1>
    <v-card class="mb-4">
      <v-card-title>Details</v-card-title>
      <v-card-text>
        <v-text-field v-model="product.name" label="Name" variant="outlined" class="mb-2" @blur="updateProduct" />
        <v-text-field v-model="product.slug" label="Slug" variant="outlined" class="mb-2" @blur="updateProduct" />
        <v-textarea v-model="product.description" label="Description" variant="outlined" class="mb-2" rows="2" @blur="updateProduct" />
        <v-checkbox v-model="product.is_active" label="Active" @change="updateProduct" />
        <template v-if="product.has_variants">
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">
            Option sets
          </div>
          <div v-for="(opt, idx) in optionSetsLocal" :key="idx" class="d-flex align-center gap-2 mb-2">
            <v-text-field v-model="opt.name" label="Option" variant="outlined" density="comfortable" hide-details style="max-width: 140px" />
            <v-text-field v-model="opt.valuesText" label="Values (comma-separated)" variant="outlined" density="comfortable" hide-details />
            <v-btn icon variant="text" size="small" @click="optionSetsLocal.splice(idx, 1)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
          <v-btn variant="outlined" size="small" class="mt-2" @click="optionSetsLocal.push({ name: '', valuesText: '' })">
            Add option
          </v-btn>
          <v-btn v-if="optionSetsChanged" color="primary" size="small" class="mt-2 ml-2" @click="saveOptionSets">
            Save option sets
          </v-btn>
        </template>
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Images</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <div v-for="img in images" :key="img.id" class="d-flex flex-column align-center">
            <v-img :src="imageUrl(img.path)" width="80" height="80" cover class="rounded" />
            <v-btn icon size="x-small" variant="text" class="mt-1" @click="deleteImage(img.id)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
          <div class="d-flex align-center justify-center rounded bg-grey-lighten-2" style="width: 80px; height: 80px">
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="d-none" @change="onFileSelect">
            <v-btn icon variant="text" @click="fileInput?.click()">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>
        </div>
        <p class="text-caption text-medium-emphasis">
          Upload JPEG, PNG or WebP (max 5MB). Order: drag or reorder by moving items.
        </p>
      </v-card-text>
    </v-card>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap gap-2">
        Variants
        <v-btn color="primary" size="small" @click="showVariant = true">
          Add variant
        </v-btn>
        <template v-if="product.has_variants && product.option_sets?.length">
          <v-btn variant="outlined" size="small" :loading="generating" @click="generateVariants">
            Generate from options
          </v-btn>
        </template>
        <v-spacer />
        <template v-if="selectedIds.length > 0">
          <span class="text-body-2">{{ selectedIds.length }} selected</span>
          <v-text-field v-model="bulkPrice" type="number" min="0" step="0.01" placeholder="Set price" density="compact" hide-details style="max-width: 120px" />
          <v-text-field v-model="bulkStock" type="number" min="0" placeholder="Set stock" density="compact" hide-details style="max-width: 100px" />
          <v-btn size="small" :loading="bulkSaving" @click="applyBulkEdit">
            Apply
          </v-btn>
          <v-btn variant="text" size="small" @click="selectedIds = []">
            Clear
          </v-btn>
        </template>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th v-if="variants.length > 1" style="width: 40px">
                <v-checkbox
                  :model-value="selectedIds.length === variants.length"
                  :indeterminate="selectedIds.length > 0 && selectedIds.length < variants.length"
                  hide-details
                  density="compact"
                  @click="toggleSelectAll"
                />
              </th>
              <th v-for="optName in optionColumns" :key="optName">
                {{ optName }}
              </th>
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th v-if="variants.length > 1" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in variants" :key="v.id">
              <td v-if="variants.length > 1">
                <v-checkbox
                  :model-value="selectedIds.includes(v.id)"
                  hide-details
                  density="compact"
                  @update:model-value="(val: boolean) => { if (val) selectedIds = [...selectedIds, v.id]; else selectedIds = selectedIds.filter(id => id !== v.id) }"
                />
              </td>
              <td v-for="optName in optionColumns" :key="optName">
                {{ (v.option_values || {})[optName] || '–' }}
              </td>
              <td>{{ v.name }}</td>
              <td>
                <v-text-field v-model="v.sku" variant="outlined" density="compact" hide-details class="mt-1" style="max-width: 120px" @blur="saveVariant(v)" />
              </td>
              <td>
                <v-text-field v-model.number="v.price" type="number" step="0.01" variant="outlined" density="compact" hide-details class="mt-1" style="max-width: 100px" @blur="saveVariant(v)" />
              </td>
              <td>
                <v-text-field v-model.number="v.stock" type="number" min="0" variant="outlined" density="compact" hide-details class="mt-1" style="max-width: 80px" @blur="saveVariant(v)" />
              </td>
              <td v-if="variants.length > 1">
                <v-btn size="small" variant="text" @click="saveVariant(v)">
                  Save
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
    <v-dialog v-model="showVariant" max-width="500" persistent>
      <v-card>
        <v-card-title>New variant</v-card-title>
        <v-card-text>
          <v-text-field v-model="variantForm.name" label="Name" variant="outlined" class="mb-2" />
          <v-text-field v-model="variantForm.sku" label="SKU" variant="outlined" class="mb-2" />
          <v-text-field v-model.number="variantForm.price" label="Price" type="number" step="0.01" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showVariant = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="addVariant">Add</v-btn>
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

const route = useRoute()
const config = useRuntimeConfig()
const id = route.params.id as string
const product = ref<any>(null)
const variants = ref<any[]>([])
const images = ref<any[]>([])
const optionSetsLocal = ref<{ name: string; valuesText: string }[]>([])
const showVariant = ref(false)
const saving = ref(false)
const generating = ref(false)
const bulkSaving = ref(false)
const bulkPrice = ref<string>('')
const bulkStock = ref<string>('')
const selectedIds = ref<string[]>([])
const variantForm = reactive({ name: '', sku: '', price: 0 })
const fileInput = ref<HTMLInputElement | null>(null)

const optionColumns = computed(() => {
  const sets = product.value?.option_sets as Array<{ name: string }> | undefined
  return sets?.map(s => s.name) ?? []
})

const optionSetsChanged = computed(() => {
  const current = product.value?.option_sets as Array<{ name: string; values: string[] }> | undefined
  if (!current?.length) return false
  const a = current.map(o => ({ name: o.name, values: [...(o.values || [])].sort().join(',') }))
  const b = optionSetsLocal.value
    .filter(o => o.name.trim())
    .map(o => ({ name: o.name, values: o.valuesText.split(',').map((v: string) => v.trim()).filter(Boolean).sort().join(',') }))
  return JSON.stringify(a) !== JSON.stringify(b)
})

function imageUrl(path: string) {
  const base = config.public.supabaseUrl as string
  if (!base) return path
  return `${base}/storage/v1/object/public/product-images/${path}`
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n)
}

async function load() {
  try {
    const data = await $fetch<any>('/api/admin/products/' + id)
    product.value = data
    variants.value = data.variants ?? []
    images.value = data.images ?? []
    const sets = (data.option_sets ?? []) as Array<{ name: string; values: string[] }>
    optionSetsLocal.value = sets.map(o => ({ name: o.name, valuesText: (o.values || []).join(', ') }))
  }
  catch {
    product.value = null
    variants.value = []
    images.value = []
  }
}

async function updateProduct() {
  if (!product.value) return
  const body: any = {
    name: product.value.name,
    slug: product.value.slug,
    description: product.value.description,
    is_active: product.value.is_active,
  }
  if (product.value.has_variants && product.value.option_sets)
    body.option_sets = product.value.option_sets
  await $fetch(`/api/admin/products/${id}`, { method: 'PUT', body })
}

function saveOptionSets() {
  const sets = optionSetsLocal.value
    .filter(o => o.name.trim() && o.valuesText.trim())
    .map(o => ({
      name: o.name.trim(),
      values: o.valuesText.split(',').map((v: string) => v.trim()).filter(Boolean),
    }))
  product.value.option_sets = sets
  updateProduct()
}

async function addVariant() {
  saving.value = true
  try {
    await $fetch(`/api/admin/products/${id}/variants`, {
      method: 'POST',
      body: {
        name: variantForm.name,
        sku: variantForm.sku || undefined,
        price: variantForm.price,
      },
    })
    showVariant.value = false
    variantForm.name = ''
    variantForm.sku = ''
    variantForm.price = 0
    await load()
  }
  finally {
    saving.value = false
  }
}

async function saveVariant(v: any) {
  const updates = [{ variant_id: v.id, price: Number(v.price), stock: Number(v.stock) }]
  await $fetch(`/api/admin/products/${id}/variants/bulk`, { method: 'PATCH', body: { updates } })
}

function toggleSelectAll() {
  if (selectedIds.value.length === variants.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = variants.value.map((x: any) => x.id)
  }
}

async function applyBulkEdit() {
  const ids = selectedIds.value
  if (ids.length === 0) return
  const updates = ids.map(variant_id => {
    const u: any = { variant_id }
    const p = Number(bulkPrice.value)
    const s = Number(bulkStock.value)
    if (!Number.isNaN(p) && bulkPrice.value !== '') u.price = p
    if (!Number.isNaN(s) && bulkStock.value !== '') u.stock = s
    return u
  }).filter(u => u.price !== undefined || u.stock !== undefined)
  if (updates.length === 0) return
  bulkSaving.value = true
  try {
    await $fetch(`/api/admin/products/${id}/variants/bulk`, { method: 'PATCH', body: { updates } })
    bulkPrice.value = ''
    bulkStock.value = ''
    selectedIds.value = []
    await load()
  }
  finally {
    bulkSaving.value = false
  }
}

async function generateVariants() {
  generating.value = true
  try {
    const sets = optionSetsLocal.value
      .filter(o => o.name.trim() && o.valuesText.trim())
      .map(o => ({
        name: o.name.trim(),
        values: o.valuesText.split(',').map((v: string) => v.trim()).filter(Boolean),
      }))
    await $fetch(`/api/admin/products/${id}/variants/generate`, {
      method: 'POST',
      body: { option_sets: sets },
    })
    await load()
  }
  finally {
    generating.value = false
  }
}

async function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  const supabase = useSupabaseClient()
  for (const file of Array.from(files)) {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
    if (error) continue
    await $fetch(`/api/admin/products/${id}/images`, {
      method: 'POST',
      body: { path },
    })
  }
  input.value = ''
  await load()
}

async function deleteImage(imageId: string) {
  await $fetch(`/api/admin/products/${id}/images/${imageId}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
