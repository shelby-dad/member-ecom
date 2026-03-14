<template>
  <div>
    <h1 class="text-h4 mb-4">
      Add product
    </h1>
    <v-card class="mb-4">
      <v-card-title>Details</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.slug" label="Slug (optional, auto from name)" variant="outlined" class="mb-2" />
        <v-textarea v-model="form.description" label="Description" variant="outlined" class="mb-2" rows="2" />
        <v-checkbox v-model="form.is_active" label="Active" />
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Variant mode</v-card-title>
      <v-card-text>
        <v-radio-group v-model="form.has_variants" hide-details>
          <v-radio :value="false" label="Single product (one price, one stock)" />
          <v-radio :value="true" label="Product with variants (option sets: Size, Color, etc.)" />
        </v-radio-group>
        <template v-if="!form.has_variants">
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">
            Default variant
          </div>
          <v-text-field v-model="form.default_variant.name" label="Variant name (optional)" variant="outlined" class="mb-2" placeholder="Default" />
          <v-text-field v-model.number="form.default_variant.price" label="Price" type="number" min="0" step="0.01" variant="outlined" class="mb-2" />
          <v-text-field v-model.number="form.default_variant.stock" label="Initial stock" type="number" min="0" variant="outlined" />
        </template>
        <template v-else>
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">
            Option sets (e.g. Size: S, M, L, XL and Color: Black, White)
          </div>
          <div v-for="(opt, idx) in form.option_sets" :key="idx" class="d-flex align-center gap-2 mb-2">
            <v-text-field v-model="opt.name" label="Option name" variant="outlined" density="comfortable" hide-details style="max-width: 140px" placeholder="Size" />
            <v-text-field v-model="opt.valuesText" label="Values (comma-separated)" variant="outlined" density="comfortable" hide-details placeholder="S, M, L, XL" />
            <v-btn icon variant="text" size="small" @click="removeOption(idx)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
          <v-btn variant="outlined" size="small" class="mt-2" @click="addOption">
            Add option
          </v-btn>
          <p v-if="combinationPreview.length > 0" class="text-caption text-medium-emphasis mt-2">
            {{ combinationPreview.length }} variant(s): {{ combinationPreview.slice(0, 5).join(', ') }}{{ combinationPreview.length > 5 ? '…' : '' }}
          </p>
        </template>
      </v-card-text>
    </v-card>
    <div class="d-flex gap-2">
      <v-btn color="primary" :loading="creating" @click="createProduct">
        Create product
      </v-btn>
      <v-btn variant="text" :to="'/admin/products'">
        Cancel
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const form = reactive({
  name: '',
  slug: '',
  description: '',
  is_active: true,
  has_variants: false,
  option_sets: [] as { name: string; valuesText: string }[],
  default_variant: { name: '', price: 0, stock: 0 },
})

const creating = ref(false)

function addOption() {
  form.option_sets.push({ name: '', valuesText: '' })
}

function removeOption(idx: number) {
  form.option_sets.splice(idx, 1)
}

const combinationPreview = computed(() => {
  if (!form.has_variants || form.option_sets.length === 0) return []
  const sets = form.option_sets
    .filter(o => o.name.trim() && o.valuesText.trim())
    .map(o => ({ name: o.name.trim(), values: o.valuesText.split(',').map(v => v.trim()).filter(Boolean) }))
  if (sets.length === 0) return []
  function combos(sets: { name: string; values: string[] }[]): Record<string, string>[] {
    if (sets.length === 0) return [{}]
    const [first, ...rest] = sets
    const restCombos = combos(rest)
    const result: Record<string, string>[] = []
    for (const v of first.values) {
      for (const c of restCombos) {
        result.push({ [first.name]: v, ...c })
      }
    }
    return result
  }
  return combos(sets).map(c => Object.values(c).join(' / '))
})

async function createProduct() {
  if (!form.name.trim()) return
  creating.value = true
  try {
    const body: any = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      is_active: form.is_active,
      has_variants: form.has_variants,
    }
    if (!form.has_variants) {
      body.default_variant = {
        name: form.default_variant.name.trim() || undefined,
        price: Number(form.default_variant.price) || 0,
        stock: Number(form.default_variant.stock) || 0,
      }
    } else {
      const sets = form.option_sets
        .filter(o => o.name.trim() && o.valuesText.trim())
        .map(o => ({ name: o.name.trim(), values: o.valuesText.split(',').map(v => v.trim()).filter(Boolean) }))
      body.option_sets = sets
      if (sets.length === 0) {
        body.variants = []
      }
    }
    const result = await $fetch<any>('/api/admin/products', { method: 'POST', body })
    await navigateTo(`/admin/products/${result.id}`)
  }
  finally {
    creating.value = false
  }
}
</script>
