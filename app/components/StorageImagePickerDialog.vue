<template>
  <v-dialog :model-value="modelValue" max-width="980" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <span>Storage Explorer</span>
        <v-spacer />
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-subtitle class="pb-0">
        Bucket: <strong>{{ bucket }}</strong>
      </v-card-subtitle>

      <v-card-text>
        <div class="d-flex align-center ga-2 mb-3 flex-wrap">
          <v-text-field
            v-model="search"
            label="Search folder or image"
            density="comfortable"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            hide-details
            style="min-width: 240px"
          />

          <v-btn size="small" variant="outlined" :disabled="!currentPrefix" @click="goToRoot">
            Root
          </v-btn>

          <v-spacer />

          <v-btn
            v-if="canUpload"
            size="small"
            variant="outlined"
            prepend-icon="mdi-upload"
            @click="fileInput?.click()"
          >
            Upload Images
          </v-btn>

          <v-btn
            v-if="canManageFolders"
            size="small"
            variant="outlined"
            prepend-icon="mdi-folder-plus-outline"
            @click="createFolderDialog = true"
          >
            Add Folder
          </v-btn>

          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="d-none" @change="onUploadFiles">
        </div>

        <div class="d-flex align-center ga-2 mb-3 flex-wrap">
          <v-chip
            v-for="(crumb, idx) in breadcrumbs"
            :key="crumb.path"
            size="small"
            clickable
            variant="tonal"
            @click="goToPrefix(crumb.path)"
          >
            {{ idx === 0 ? 'root' : crumb.name }}
          </v-chip>
        </div>

        <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-3">
          {{ errorMsg }}
        </v-alert>

        <div v-if="selectedPath" class="mb-4">
          <div class="text-caption text-medium-emphasis mb-2">Selected image</div>
          <button type="button" class="image-tile image-tile--selected" @click="selectFile(selectedPath)">
            <v-img :src="imageUrl(selectedPath)" class="fill-size" cover />
          </button>
        </div>

        <div class="explorer-scroll" @scroll.passive="onScroll">
          <div class="mb-3">
            <div class="text-subtitle-2 mb-2">Folders</div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="folder in folderItems"
                :key="folder.path"
                prepend-icon="mdi-folder-outline"
                clickable
                @click="openFolder(folder.path)"
              >
                {{ folder.name }}
                <template #append>
                  <v-menu v-if="canManageFolders" location="bottom end">
                    <template #activator="{ props: menuProps }">
                      <v-btn icon size="x-small" variant="text" v-bind="menuProps" @click.stop>
                        <v-icon size="14">mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list density="compact">
                      <v-list-item @click="openRenameFolderDialog(folder.path)">
                        <v-list-item-title>Rename</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-chip>
              <span v-if="!folderItems.length" class="text-caption text-medium-emphasis">No folders</span>
            </div>
          </div>

          <div>
            <div class="text-subtitle-2 mb-2">Images</div>
            <div class="d-flex flex-wrap ga-2">
              <button
                v-for="file in imageItems"
                :key="file.path"
                type="button"
                class="image-tile"
                :class="{ 'image-tile--selected': file.path === selectedPath }"
                @click="selectFile(file.path)"
              >
                <v-img :src="imageUrl(file.path)" class="fill-size" cover />
              </button>
            </div>
            <p v-if="!imageItems.length && !loading" class="text-caption text-medium-emphasis mt-2">
              No images in this folder.
            </p>
          </div>

          <div v-if="loading" class="text-center py-4">
            <v-progress-circular indeterminate size="20" />
          </div>
          <div v-else-if="hasMore" class="text-center py-3 text-caption text-medium-emphasis">
            Scroll down to load more...
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="createFolderDialog" max-width="420">
      <v-card>
        <v-card-title>Add Folder</v-card-title>
        <v-card-text>
          <v-text-field v-model="newFolderName" label="Folder name" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createFolderDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="folderActionLoading" @click="createFolder">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameFolderDialog" max-width="420">
      <v-card>
        <v-card-title>Rename Folder</v-card-title>
        <v-card-text>
          <v-text-field v-model="renameFolderName" label="New folder name" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="renameFolderDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="folderActionLoading" @click="renameFolder">Rename</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  bucket?: string
  selectedPath?: string
}>(), {
  bucket: 'product-images',
  selectedPath: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'selected', path: string): void
}>()

const config = useRuntimeConfig()
const supabase = useSupabaseClient()
const { ensureProfile } = useProfile()
const loading = ref(false)
const errorMsg = ref('')
const search = ref('')
const currentPrefix = ref('')
const items = ref<Array<{ name: string; path: string; kind: 'folder' | 'file' }>>([])
const pageSize = 50
const nextOffset = ref(0)
const hasMore = ref(true)
const fileInput = ref<HTMLInputElement | null>(null)
const role = ref<string>('member')

const createFolderDialog = ref(false)
const renameFolderDialog = ref(false)
const folderActionLoading = ref(false)
const newFolderName = ref('')
const folderRenamePath = ref('')
const renameFolderName = ref('')

const canManageFolders = computed(() => role.value === 'superadmin' || role.value === 'admin')
const canUpload = computed(() => role.value === 'superadmin' || role.value === 'admin' || role.value === 'staff')

const breadcrumbs = computed(() => {
  const parts = currentPrefix.value.split('/').filter(Boolean)
  const crumbs = [{ name: 'root', path: '' }]
  let acc = ''
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p
    crumbs.push({ name: p, path: acc })
  }
  return crumbs
})

const sortedItems = computed(() => {
  const selected = props.selectedPath
  const list = [...items.value]

  list.sort((a, b) => {
    if (a.kind !== b.kind)
      return a.kind === 'folder' ? -1 : 1
    if (selected) {
      if (a.path === selected && b.path !== selected) return -1
      if (b.path === selected && a.path !== selected) return 1
    }
    return a.name.localeCompare(b.name)
  })

  return list
})

const folderItems = computed(() => sortedItems.value.filter(i => i.kind === 'folder'))

const imageItems = computed(() => {
  const isImage = (path: string) => /\.(png|jpe?g|webp)$/i.test(path)
  return sortedItems.value.filter(i =>
    i.kind === 'file'
    && i.name !== '.keep'
    && i.name !== '.folder-placeholder.png'
    && isImage(i.path),
  )
})

function close() {
  emit('update:modelValue', false)
}

function imageUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/${props.bucket}/${path}` : path
}

async function loadRole() {
  const profile = await ensureProfile()
  role.value = profile?.role ?? 'member'
}

async function fetchPage(reset = false) {
  if (loading.value) return
  if (!hasMore.value && !reset) return

  loading.value = true
  errorMsg.value = ''
  try {
    if (reset) {
      nextOffset.value = 0
      hasMore.value = true
      items.value = []
    }

    const options: any = {
      limit: pageSize,
      offset: nextOffset.value,
      sortBy: { column: 'name', order: 'asc' },
    }
    if (search.value.trim())
      options.search = search.value.trim()

    const { data, error } = await supabase.storage.from(props.bucket).list(currentPrefix.value, options)
    if (error)
      throw error

    const pageItems = (data ?? []).map((d: any) => {
      const kind: 'folder' | 'file' = d.id ? 'file' : 'folder'
      const path = currentPrefix.value ? `${currentPrefix.value}/${d.name}` : d.name
      return { name: d.name, path, kind }
    })

    const map = new Map(items.value.map(i => [i.path, i]))
    for (const item of pageItems)
      map.set(item.path, item)
    items.value = Array.from(map.values())

    nextOffset.value += pageItems.length
    hasMore.value = pageItems.length === pageSize
  }
  catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load storage explorer'
  }
  finally {
    loading.value = false
  }
}

function goToRoot() {
  currentPrefix.value = ''
  fetchPage(true)
}

function goToPrefix(prefix: string) {
  currentPrefix.value = prefix
  fetchPage(true)
}

function openFolder(path: string) {
  currentPrefix.value = path
  fetchPage(true)
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  if (!el || loading.value || !hasMore.value) return
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32
  if (nearBottom)
    fetchPage(false)
}

function selectFile(path: string) {
  emit('selected', path)
  emit('update:modelValue', false)
}

function sanitizeFolderName(raw: string): string {
  return raw.trim().replace(/\/+$/g, '').replace(/^\/+|\s+/g, '-')
}

async function createFolder() {
  if (!canManageFolders.value) return
  const name = sanitizeFolderName(newFolderName.value)
  if (!name) return

  folderActionLoading.value = true
  try {
    const prefix = currentPrefix.value ? `${currentPrefix.value}/` : ''
    const keepPath = `${prefix}${name}/.folder-placeholder.png`
    // 1x1 transparent PNG so it passes image-only bucket MIME restrictions.
    const placeholderPng = Uint8Array.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82,
    ])
    const { error } = await supabase.storage.from(props.bucket).upload(keepPath, placeholderPng, { upsert: false, contentType: 'image/png' })
    if (error)
      throw error

    newFolderName.value = ''
    createFolderDialog.value = false
    await fetchPage(true)
  }
  catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to create folder'
  }
  finally {
    folderActionLoading.value = false
  }
}

function openRenameFolderDialog(path: string) {
  if (!canManageFolders.value) return
  folderRenamePath.value = path
  renameFolderName.value = path.split('/').pop() ?? ''
  renameFolderDialog.value = true
}

async function listAllFilesRecursively(prefix: string): Promise<string[]> {
  const files: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(props.bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error)
      throw error
    const rows = data ?? []
    for (const row of rows) {
      const fullPath = `${prefix}/${row.name}`
      if (row.id)
        files.push(fullPath)
      else
        files.push(...await listAllFilesRecursively(fullPath))
    }
    if (rows.length < 100)
      break
    offset += rows.length
  }

  return files
}

async function renameFolder() {
  if (!canManageFolders.value) return
  const fromPrefix = folderRenamePath.value
  const newName = sanitizeFolderName(renameFolderName.value)
  if (!fromPrefix || !newName) return

  const parent = fromPrefix.includes('/') ? fromPrefix.slice(0, fromPrefix.lastIndexOf('/')) : ''
  const fromName = fromPrefix.split('/').pop() ?? ''
  if (newName === fromName) {
    renameFolderDialog.value = false
    return
  }
  const toPrefix = parent ? `${parent}/${newName}` : newName

  folderActionLoading.value = true
  try {
    const files = await listAllFilesRecursively(fromPrefix)
    for (const from of files) {
      const suffix = from.slice(fromPrefix.length)
      const to = `${toPrefix}${suffix}`
      const { error } = await supabase.storage.from(props.bucket).move(from, to)
      if (error)
        throw error
    }

    renameFolderDialog.value = false
    folderRenamePath.value = ''
    await fetchPage(true)
  }
  catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to rename folder'
  }
  finally {
    folderActionLoading.value = false
  }
}

async function onUploadFiles(e: Event) {
  if (!canUpload.value) return
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  errorMsg.value = ''
  for (const file of Array.from(files)) {
    const ext = file.name.split('.').pop() || 'jpg'
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
    const safeName = `${baseName || 'image'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const path = currentPrefix.value ? `${currentPrefix.value}/${safeName}` : safeName

    const { error } = await supabase.storage.from(props.bucket).upload(path, file, { upsert: false })
    if (error)
      errorMsg.value = error.message
  }

  input.value = ''
  await fetchPage(true)
}

watch(search, () => fetchPage(true))

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await loadRole()
      fetchPage(true)
    }
  },
)
</script>

<style scoped>
.explorer-scroll {
  max-height: 62vh;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  padding: 0.75rem;
}

.image-tile {
  width: 126px;
  height: 72px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 10px;
  overflow: hidden;
  padding: 0;
  background: rgba(148, 163, 184, 0.08);
}

.image-tile--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.fill-size {
  width: 100%;
  height: 100%;
}
</style>
