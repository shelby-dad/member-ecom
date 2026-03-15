<template>
  <v-dialog :model-value="modelValue" max-width="520" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>Create {{ title }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.slug" label="Slug (optional)" variant="outlined" class="mb-2" />

        <template v-if="type === 'category'">
          <v-select
            v-model="form.parent_id"
            :items="categories"
            item-title="name"
            item-value="id"
            label="Parent category (optional)"
            variant="outlined"
            clearable
            class="mb-2"
          />
          <v-text-field v-model.number="form.sort_order" type="number" label="Sort order" variant="outlined" class="mb-2" />
          <v-checkbox v-model="form.is_active" label="Active" />
        </template>

        <template v-else-if="type === 'brand'">
          <div class="d-flex align-center ga-2 mb-2">
            <v-btn variant="outlined" @click="showImagePicker = true">
              Choose image
            </v-btn>
            <v-img v-if="form.image_path" :src="storageImageUrl(form.image_path)" width="58" height="36" cover class="rounded border" />
          </div>
          <v-checkbox v-model="form.is_active" label="Active" />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Create</v-btn>
      </v-card-actions>
    </v-card>
    <StorageImagePickerDialog
      v-model="showImagePicker"
      :selected-path="form.image_path || ''"
      @selected="(path) => { form.image_path = path; showImagePicker = false }"
    />
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  type: 'brand' | 'category' | 'tag'
  categories?: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', payload: any): void
}>()

const config = useRuntimeConfig()
const saving = ref(false)
const showImagePicker = ref(false)

const form = reactive({
  name: '',
  slug: '',
  parent_id: null as string | null,
  sort_order: 0,
  is_active: true,
  image_path: '',
})

const title = computed(() => {
  if (props.type === 'brand') return 'brand model'
  if (props.type === 'category') return 'category'
  return 'tag'
})

const categories = computed(() => props.categories ?? [])

function reset() {
  form.name = ''
  form.slug = ''
  form.parent_id = null
  form.sort_order = 0
  form.is_active = true
  form.image_path = ''
}

function storageImageUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

async function save() {
  if (!form.name.trim()) return
  saving.value = true
  try {
    let created: any = null
    if (props.type === 'brand') {
      created = await $fetch('/api/admin/product-metadata/brands', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          image_path: form.image_path || null,
          is_active: form.is_active,
        },
      })
    }
    else if (props.type === 'category') {
      created = await $fetch('/api/admin/product-metadata/categories', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          parent_id: form.parent_id,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        },
      })
    }
    else {
      created = await $fetch('/api/admin/product-metadata/tags', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
        },
      })
    }
    emit('created', created)
    emit('update:modelValue', false)
    reset()
  }
  finally {
    saving.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open)
    reset()
})
</script>

