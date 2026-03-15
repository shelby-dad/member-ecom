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
        <v-card>
          <v-card-title class="d-flex align-center">
            Categories
            <v-spacer />
            <v-btn v-if="canManage" color="primary" size="small" @click="openCategoryDialog()">
              Add category
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Sort</th>
                  <th>Active</th>
                  <th v-if="canManage">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in orderedCategories" :key="c.id">
                  <td>{{ indentLabel(c) }}</td>
                  <td>{{ c.slug }}</td>
                  <td>{{ categoryNameById[c.parent_id] || '-' }}</td>
                  <td>{{ c.sort_order }}</td>
                  <td>{{ c.is_active ? 'Yes' : 'No' }}</td>
                  <td v-if="canManage">
                    <v-btn size="small" variant="text" @click="openCategoryDialog(c)">Edit</v-btn>
                    <v-btn size="small" color="error" variant="text" @click="deleteCategory(c)">Delete</v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="tags">
        <v-card>
          <v-card-title class="d-flex align-center">
            Tags
            <v-spacer />
            <v-btn v-if="canManage" color="primary" size="small" @click="openTagDialog()">
              Add tag
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th v-if="canManage">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in tags" :key="t.id">
                  <td>{{ t.name }}</td>
                  <td>{{ t.slug }}</td>
                  <td v-if="canManage">
                    <v-btn size="small" variant="text" @click="openTagDialog(t)">Edit</v-btn>
                    <v-btn size="small" color="error" variant="text" @click="deleteTag(t)">Delete</v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="brands">
        <v-card>
          <v-card-title class="d-flex align-center">
            Brand model
            <v-spacer />
            <v-btn v-if="canManage" color="primary" size="small" @click="openBrandDialog()">
              Add brand model
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Active</th>
                  <th v-if="canManage">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in brands" :key="b.id">
                  <td>
                    <v-img v-if="b.image_path" :src="storageImageUrl(b.image_path)" width="44" height="28" cover class="rounded border" />
                    <span v-else>-</span>
                  </td>
                  <td>{{ b.name }}</td>
                  <td>{{ b.slug }}</td>
                  <td>{{ b.is_active ? 'Yes' : 'No' }}</td>
                  <td v-if="canManage">
                    <v-btn size="small" variant="text" @click="openBrandDialog(b)">Edit</v-btn>
                    <v-btn size="small" color="error" variant="text" @click="deleteBrand(b)">Delete</v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
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
            <v-img v-if="brandForm.image_path" :src="storageImageUrl(brandForm.image_path)" width="58" height="36" cover class="rounded border" />
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

const categories = ref<any[]>([])
const tags = ref<any[]>([])
const brands = ref<any[]>([])
const saving = ref(false)
const showImagePicker = ref(false)

const showCategoryDialog = ref(false)
const showTagDialog = ref(false)
const showBrandDialog = ref(false)

const categoryForm = reactive({ id: '', name: '', slug: '', parent_id: null as string | null, sort_order: 0, is_active: true })
const tagForm = reactive({ id: '', name: '', slug: '' })
const brandForm = reactive({ id: '', name: '', slug: '', image_path: '', is_active: true })

const categoryNameById = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c.name])) as Record<string, string>,
)

const parentCategoryOptions = computed(() =>
  categories.value.filter(c => c.id !== categoryForm.id),
)

const orderedCategories = computed(() => {
  const byParent: Record<string, any[]> = {}
  const roots: any[] = []
  for (const c of categories.value) {
    const key = c.parent_id || 'root'
    byParent[key] = byParent[key] || []
    byParent[key].push(c)
    if (!c.parent_id) roots.push(c)
  }
  for (const list of Object.values(byParent))
    list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))

  const result: any[] = []
  function visit(node: any, depth: number) {
    result.push({ ...node, _depth: depth })
    for (const child of (byParent[node.id] || []))
      visit(child, depth + 1)
  }
  for (const root of (byParent.root || []))
    visit(root, 0)
  return result
})

function indentLabel(category: any) {
  return `${'  '.repeat(category._depth || 0)}${category.name}`
}

function storageImageUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

async function load() {
  const data = await $fetch<any>('/api/admin/product-metadata')
  categories.value = data?.categories ?? []
  tags.value = data?.tags ?? []
  brands.value = data?.brands ?? []
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
    await load()
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
    await load()
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
    await load()
  }
  finally {
    saving.value = false
  }
}

async function deleteCategory(c: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/categories/${c.id}`, { method: 'DELETE' })
  await load()
}

async function deleteTag(t: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/tags/${t.id}`, { method: 'DELETE' })
  await load()
}

async function deleteBrand(b: any) {
  if (!canManage.value) return
  await $fetch(`/api/admin/product-metadata/brands/${b.id}`, { method: 'DELETE' })
  await load()
}

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  role.value = (profile?.role as any) ?? null
  await load()
})
</script>

