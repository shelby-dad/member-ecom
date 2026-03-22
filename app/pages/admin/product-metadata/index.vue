<template>
  <div>
    <h1 class="text-h4 mb-4">
      Product metadata
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Manage categories, tags, and brand model. Staff can view only.
    </p>

    <v-tabs v-model="tab" class="mb-3">
      <v-tab value="categories">Categories</v-tab>
      <v-tab value="tags">Tags</v-tab>
      <v-tab value="brands">Brand model</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="categories">
        <AppDataTableToolbar card-class="mb-3">
          <template #filters>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="categorySearch"
                label="Search"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-magnify"
                class="app-filter-field"
              />
            </v-col>
          </template>
          <template #actions>
            <v-col v-if="canManage" cols="12" sm="6" md="4" class="d-flex justify-end ms-auto">
              <v-btn color="primary" size="small" @click="openCategoryDialog()">
                Add category
              </v-btn>
            </v-col>
          </template>
        </AppDataTableToolbar>
        <v-data-table-server
          v-model:page="categoryPage"
          v-model:items-per-page="categoryItemsPerPage"
          v-model:sort-by="categorySortBy"
          :headers="categoryHeaders"
          :items="categoryItems"
          :items-length="categoryTotal"
          :loading="categoryLoading"
          :items-per-page-options="itemsPerPageOptions"
          class="elevation-0 metadata-table"
        >
          <template #item.name="{ item }">
            {{ item.name }}
          </template>
          <template #item.slug="{ item }">
            {{ item.slug || '-' }}
          </template>
          <template #item.parent_name="{ item }">
            {{ item.parent_name || '-' }}
          </template>
          <template #item.is_active="{ item }">
            {{ item.is_active ? 'Yes' : 'No' }}
          </template>
          <template #item.actions="{ item }">
            <div v-if="canManage" class="d-flex align-center justify-end ga-1">
              <v-btn size="small" variant="text" icon="mdi-pencil" @click="openCategoryDialog(item)" />
              <v-btn size="small" color="error" variant="text" icon="mdi-trash-can" @click="deleteCategory(item)" />
            </div>
          </template>
        </v-data-table-server>
      </v-window-item>

      <v-window-item value="tags">
        <AppDataTableToolbar card-class="mb-3">
          <template #filters>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="tagSearch"
                label="Search"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-magnify"
                class="app-filter-field"
              />
            </v-col>
          </template>
          <template #actions>
            <v-col v-if="canManage" cols="12" sm="6" md="4" class="d-flex justify-end ms-auto">
              <v-btn color="primary" size="small" @click="openTagDialog()">
                Add tag
              </v-btn>
            </v-col>
          </template>
        </AppDataTableToolbar>
        <v-data-table-server
          v-model:page="tagPage"
          v-model:items-per-page="tagItemsPerPage"
          v-model:sort-by="tagSortBy"
          :headers="tagHeaders"
          :items="tagItems"
          :items-length="tagTotal"
          :loading="tagLoading"
          :items-per-page-options="itemsPerPageOptions"
          class="elevation-0 metadata-table"
        >
          <template #item.slug="{ item }">
            {{ item.slug || '-' }}
          </template>
          <template #item.actions="{ item }">
            <div v-if="canManage" class="d-flex align-center justify-end ga-1">
              <v-btn size="small" variant="text" icon="mdi-pencil" @click="openTagDialog(item)" />
              <v-btn size="small" color="error" variant="text" icon="mdi-trash-can" @click="deleteTag(item)" />
            </div>
          </template>
        </v-data-table-server>
      </v-window-item>

      <v-window-item value="brands">
        <AppDataTableToolbar card-class="mb-3">
          <template #filters>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="brandSearch"
                label="Search"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-magnify"
                class="app-filter-field"
              />
            </v-col>
          </template>
          <template #actions>
            <v-col v-if="canManage" cols="12" sm="6" md="4" class="d-flex justify-end ms-auto">
              <v-btn color="primary" size="small" @click="openBrandDialog()">
                Add brand model
              </v-btn>
            </v-col>
          </template>
        </AppDataTableToolbar>
        <v-data-table-server
          v-model:page="brandPage"
          v-model:items-per-page="brandItemsPerPage"
          v-model:sort-by="brandSortBy"
          :headers="brandHeaders"
          :items="brandItems"
          :items-length="brandTotal"
          :loading="brandLoading"
          :items-per-page-options="itemsPerPageOptions"
          class="elevation-0 metadata-table"
        >
          <template #item.image_path="{ item }">
            <v-img
              v-if="item.image_path"
              :src="storageImageUrl(item.image_path)"
              width="44"
              height="28"
              cover
              class="rounded border"
            />
            <span v-else>-</span>
          </template>
          <template #item.slug="{ item }">
            {{ item.slug || '-' }}
          </template>
          <template #item.is_active="{ item }">
            {{ item.is_active ? 'Yes' : 'No' }}
          </template>
          <template #item.actions="{ item }">
            <div v-if="canManage" class="d-flex align-center justify-end ga-1">
              <v-btn size="small" variant="text" icon="mdi-pencil" @click="openBrandDialog(item)" />
              <v-btn size="small" color="error" variant="text" icon="mdi-trash-can" @click="deleteBrand(item)" />
            </div>
          </template>
        </v-data-table-server>
      </v-window-item>
    </v-window>

    <v-dialog v-model="showCategoryDialog" max-width="520">
      <v-card>
        <v-card-title>{{ categoryForm.id ? 'Edit category' : 'Add category' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="categoryForm.name" label="Name" variant="outlined" class="mb-2" />
          <v-text-field v-model="categoryForm.slug" label="Slug (optional)" variant="outlined" class="mb-2" />
          <v-select
            v-model="categoryForm.parent_id"
            :items="parentCategoryOptions"
            item-title="name"
            item-value="id"
            label="Parent category (optional)"
            variant="outlined"
            clearable
            class="mb-2"
          />
          <v-text-field v-model.number="categoryForm.sort_order" type="number" label="Sort order" variant="outlined" class="mb-2" />
          <v-checkbox v-model="categoryForm.is_active" label="Active" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCategoryDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveCategory">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTagDialog" max-width="460">
      <v-card>
        <v-card-title>{{ tagForm.id ? 'Edit tag' : 'Add tag' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="tagForm.name" label="Name" variant="outlined" class="mb-2" />
          <v-text-field v-model="tagForm.slug" label="Slug (optional)" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTagDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveTag">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showBrandDialog" max-width="520">
      <v-card>
        <v-card-title>{{ brandForm.id ? 'Edit brand model' : 'Add brand model' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="brandForm.name" label="Name" variant="outlined" class="mb-2" />
          <v-text-field v-model="brandForm.slug" label="Slug (optional)" variant="outlined" class="mb-2" />
          <div class="d-flex align-center ga-2 mb-2">
            <v-btn variant="outlined" @click="showImagePicker = true">
              Choose image
            </v-btn>
            <div v-if="brandForm.image_path" class="brand-modal-avatar">
              <v-img
                :src="storageImageUrl(brandForm.image_path)"
                width="48"
                height="48"
                contain
                class="brand-modal-avatar-image"
              />
            </div>
          </div>
          <v-checkbox v-model="brandForm.is_active" label="Active" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showBrandDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveBrand">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <StorageImagePickerDialog
      v-model="showImagePicker"
      :selected-path="brandForm.image_path || ''"
      @selected="(path) => { brandForm.image_path = path; showImagePicker = false }"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const config = useRuntimeConfig()
const tab = ref<'categories' | 'tags' | 'brands'>('categories')
const role = ref<'superadmin' | 'admin' | 'staff' | 'member' | null>(null)
const canManage = computed(() => role.value === 'superadmin' || role.value === 'admin')

type TableSort = Array<{ key: string, order?: 'asc' | 'desc' | boolean }>
type MetadataTableKey = 'categories' | 'tags' | 'brands'

const categories = ref<any[]>([]) // Full category list for parent selector.
const saving = ref(false)
const showImagePicker = ref(false)
const itemsPerPageOptions = [
  { value: 10, title: '10' },
  { value: 25, title: '25' },
  { value: 50, title: '50' },
]

const categorySearch = ref('')
const tagSearch = ref('')
const brandSearch = ref('')
const categoryPage = ref(1)
const categoryItemsPerPage = ref(10)
const categorySortBy = ref<TableSort>([{ key: 'sort_order', order: 'asc' }])
const categoryItems = ref<any[]>([])
const categoryTotal = ref(0)
const categoryLoading = ref(false)

const tagPage = ref(1)
const tagItemsPerPage = ref(10)
const tagSortBy = ref<TableSort>([{ key: 'name', order: 'asc' }])
const tagItems = ref<any[]>([])
const tagTotal = ref(0)
const tagLoading = ref(false)

const brandPage = ref(1)
const brandItemsPerPage = ref(10)
const brandSortBy = ref<TableSort>([{ key: 'name', order: 'asc' }])
const brandItems = ref<any[]>([])
const brandTotal = ref(0)
const brandLoading = ref(false)

let categorySearchTimer: ReturnType<typeof setTimeout> | null = null
let tagSearchTimer: ReturnType<typeof setTimeout> | null = null
let brandSearchTimer: ReturnType<typeof setTimeout> | null = null

const showCategoryDialog = ref(false)
const showTagDialog = ref(false)
const showBrandDialog = ref(false)

const categoryForm = reactive({ id: '', name: '', slug: '', parent_id: null as string | null, sort_order: 0, is_active: true })
const tagForm = reactive({ id: '', name: '', slug: '' })
const brandForm = reactive({ id: '', name: '', slug: '', image_path: '', is_active: true })

const parentCategoryOptions = computed(() =>
  categories.value.filter(c => c.id !== categoryForm.id),
)

const categoryHeaders = computed(() => {
  const headers: any[] = [
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Slug', key: 'slug', sortable: true },
    { title: 'Parent', key: 'parent_name', sortable: true },
    { title: 'Sort', key: 'sort_order', sortable: true },
    { title: 'Active', key: 'is_active', sortable: true },
  ]
  if (canManage.value)
    headers.push({ title: 'Actions', key: 'actions', sortable: false, align: 'end' })
  return headers
})

const tagHeaders = computed(() => {
  const headers: any[] = [
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Slug', key: 'slug', sortable: true },
  ]
  if (canManage.value)
    headers.push({ title: 'Actions', key: 'actions', sortable: false, align: 'end' })
  return headers
})

const brandHeaders = computed(() => {
  const headers: any[] = [
    { title: 'Image', key: 'image_path', sortable: false, width: 88 },
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Slug', key: 'slug', sortable: true },
    { title: 'Active', key: 'is_active', sortable: true },
  ]
  if (canManage.value)
    headers.push({ title: 'Actions', key: 'actions', sortable: false, align: 'end' })
  return headers
})

function storageImageUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function resolveSort(sortBy: TableSort, fallbackKey: string) {
  const key = String(sortBy?.[0]?.key ?? fallbackKey)
  const orderRaw = sortBy?.[0]?.order
  const order = orderRaw === 'desc' ? 'desc' : 'asc'
  return { key, order }
}

async function loadCategoryParents() {
  const data = await $fetch<any>('/api/admin/product-metadata')
  categories.value = data?.categories ?? []
}

async function loadCategoryItems() {
  categoryLoading.value = true
  try {
    const sort = resolveSort(categorySortBy.value, 'sort_order')
    const data = await $fetch<any>('/api/admin/product-metadata', {
      query: {
        table: 'categories',
        search: categorySearch.value,
        page: categoryPage.value,
        pageSize: categoryItemsPerPage.value,
        sortKey: sort.key,
        sortOrder: sort.order,
      },
    })
    categoryItems.value = data?.items ?? []
    categoryTotal.value = Number(data?.total ?? 0)
  }
  finally {
    categoryLoading.value = false
  }
}

async function loadTagItems() {
  tagLoading.value = true
  try {
    const sort = resolveSort(tagSortBy.value, 'name')
    const data = await $fetch<any>('/api/admin/product-metadata', {
      query: {
        table: 'tags',
        search: tagSearch.value,
        page: tagPage.value,
        pageSize: tagItemsPerPage.value,
        sortKey: sort.key,
        sortOrder: sort.order,
      },
    })
    tagItems.value = data?.items ?? []
    tagTotal.value = Number(data?.total ?? 0)
  }
  finally {
    tagLoading.value = false
  }
}

async function loadBrandItems() {
  brandLoading.value = true
  try {
    const sort = resolveSort(brandSortBy.value, 'name')
    const data = await $fetch<any>('/api/admin/product-metadata', {
      query: {
        table: 'brands',
        search: brandSearch.value,
        page: brandPage.value,
        pageSize: brandItemsPerPage.value,
        sortKey: sort.key,
        sortOrder: sort.order,
      },
    })
    brandItems.value = data?.items ?? []
    brandTotal.value = Number(data?.total ?? 0)
  }
  finally {
    brandLoading.value = false
  }
}

async function loadByTab(targetTab: MetadataTableKey = tab.value) {
  if (targetTab === 'categories')
    await loadCategoryItems()
  else if (targetTab === 'tags')
    await loadTagItems()
  else
    await loadBrandItems()
}

function openCategoryDialog(c?: any) {
  categoryForm.id = c?.id ?? ''
  categoryForm.name = c?.name ?? ''
  categoryForm.slug = c?.slug ?? ''
  categoryForm.parent_id = c?.parent_id ?? null
  categoryForm.sort_order = c?.sort_order ?? 0
  categoryForm.is_active = c?.is_active ?? true
  showCategoryDialog.value = true
}

function openTagDialog(t?: any) {
  tagForm.id = t?.id ?? ''
  tagForm.name = t?.name ?? ''
  tagForm.slug = t?.slug ?? ''
  showTagDialog.value = true
}

function openBrandDialog(b?: any) {
  brandForm.id = b?.id ?? ''
  brandForm.name = b?.name ?? ''
  brandForm.slug = b?.slug ?? ''
  brandForm.image_path = b?.image_path ?? ''
  brandForm.is_active = b?.is_active ?? true
  showBrandDialog.value = true
}

async function saveCategory() {
  if (!canManage.value) return
  saving.value = true
  try {
    const body = {
      name: categoryForm.name,
      slug: categoryForm.slug || undefined,
      parent_id: categoryForm.parent_id,
      sort_order: Number(categoryForm.sort_order) || 0,
      is_active: categoryForm.is_active,
    }
    if (categoryForm.id)
      await $fetch(`/api/admin/product-metadata/categories/${categoryForm.id}`, { method: 'PUT', body })
    else
      await $fetch('/api/admin/product-metadata/categories', { method: 'POST', body })
    showCategoryDialog.value = false
    await Promise.all([loadCategoryParents(), loadCategoryItems()])
  }
  finally {
    saving.value = false
  }
}

async function saveTag() {
  if (!canManage.value) return
  saving.value = true
  try {
    const body = { name: tagForm.name, slug: tagForm.slug || undefined }
    if (tagForm.id)
      await $fetch(`/api/admin/product-metadata/tags/${tagForm.id}`, { method: 'PUT', body })
    else
      await $fetch('/api/admin/product-metadata/tags', { method: 'POST', body })
    showTagDialog.value = false
    await loadTagItems()
  }
  finally {
    saving.value = false
  }
}

async function saveBrand() {
  if (!canManage.value) return
  saving.value = true
  try {
    const body = {
      name: brandForm.name,
      slug: brandForm.slug || undefined,
      image_path: brandForm.image_path || null,
      is_active: brandForm.is_active,
    }
    if (brandForm.id)
      await $fetch(`/api/admin/product-metadata/brands/${brandForm.id}`, { method: 'PUT', body })
    else
      await $fetch('/api/admin/product-metadata/brands', { method: 'POST', body })
    showBrandDialog.value = false
    await loadBrandItems()
  }
  finally {
    saving.value = false
  }
}

async function deleteCategory(c: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/categories/${c.id}`, { method: 'DELETE' })
  await Promise.all([loadCategoryParents(), loadCategoryItems()])
}

async function deleteTag(t: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/tags/${t.id}`, { method: 'DELETE' })
  await loadTagItems()
}

async function deleteBrand(b: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/brands/${b.id}`, { method: 'DELETE' })
  await loadBrandItems()
}

watch(tab, async (value) => {
  await loadByTab(value)
})

watch([categoryPage, categoryItemsPerPage], () => {
  loadCategoryItems()
})
watch([tagPage, tagItemsPerPage], () => {
  loadTagItems()
})
watch([brandPage, brandItemsPerPage], () => {
  loadBrandItems()
})

watch(categorySortBy, () => {
  categoryPage.value = 1
  loadCategoryItems()
}, { deep: true })
watch(tagSortBy, () => {
  tagPage.value = 1
  loadTagItems()
}, { deep: true })
watch(brandSortBy, () => {
  brandPage.value = 1
  loadBrandItems()
}, { deep: true })

watch(categorySearch, () => {
  categoryPage.value = 1
  if (categorySearchTimer)
    clearTimeout(categorySearchTimer)
  categorySearchTimer = setTimeout(() => {
    loadCategoryItems()
  }, 350)
})
watch(tagSearch, () => {
  tagPage.value = 1
  if (tagSearchTimer)
    clearTimeout(tagSearchTimer)
  tagSearchTimer = setTimeout(() => {
    loadTagItems()
  }, 350)
})
watch(brandSearch, () => {
  brandPage.value = 1
  if (brandSearchTimer)
    clearTimeout(brandSearchTimer)
  brandSearchTimer = setTimeout(() => {
    loadBrandItems()
  }, 350)
})

onBeforeUnmount(() => {
  if (categorySearchTimer)
    clearTimeout(categorySearchTimer)
  if (tagSearchTimer)
    clearTimeout(tagSearchTimer)
  if (brandSearchTimer)
    clearTimeout(brandSearchTimer)
})

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  role.value = (profile?.role as any) ?? null
  await loadCategoryParents()
  await Promise.all([loadCategoryItems(), loadTagItems(), loadBrandItems()])
})
</script>

<style scoped>
.brand-modal-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand-modal-avatar-image {
  width: 100%;
  height: 100%;
}
</style>
