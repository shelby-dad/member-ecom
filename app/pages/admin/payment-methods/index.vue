<template>
  <div>
    <h1 class="text-h4 mb-4">
      Payment methods
    </h1>
    <v-btn color="primary" class="mb-4" @click="showCreate = true">
      Add bank transfer
    </v-btn>
    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Account name</th>
          <th>Account number</th>
          <th>Bank</th>
          <th>QR</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pm in methods" :key="pm.id">
          <td>{{ pm.name }}</td>
          <td class="text-capitalize">{{ pm.type?.replace('_', ' ') }}</td>
          <td>{{ pm.account_name || '–' }}</td>
          <td>{{ pm.account_number || '–' }}</td>
          <td>{{ pm.bank_name || '–' }}</td>
          <td>
            <v-img v-if="pm.image_path" :src="imageUrl(pm.image_path)" width="72" height="72" cover class="rounded border" />
            <span v-else>–</span>
          </td>
          <td>{{ pm.is_active ? 'Yes' : 'No' }}</td>
          <td>
            <v-btn
              v-if="pm.type === 'bank_transfer'"
              size="small"
              variant="text"
              icon="mdi-pencil"
              @click="openEdit(pm)"
            />
            <span v-else>–</span>
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-dialog v-model="showCreate" max-width="500" persistent>
      <v-card>
        <v-card-title>New bank transfer method</v-card-title>
        <v-card-text>
          <v-text-field v-model="createForm.name" label="Name (e.g. Bank Transfer)" variant="outlined" class="mb-2" />
          <v-text-field
            v-model="createForm.account_name"
            label="Account name"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="createForm.account_number"
            label="Account number"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field v-model="createForm.bank_name" label="Bank name" variant="outlined" class="mb-2" />
          <div class="d-flex align-center ga-2 mb-2">
            <v-btn size="small" variant="outlined" prepend-icon="mdi-image-search-outline" @click="openQrPicker('create')">
              Choose QR image
            </v-btn>
            <v-btn
              v-if="createForm.image_path"
              size="small"
              variant="text"
              color="error"
              @click="createForm.image_path = ''"
            >
              Clear
            </v-btn>
          </div>
          <v-img v-if="createForm.image_path" :src="imageUrl(createForm.image_path)" width="96" height="96" cover class="rounded border mb-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreate = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="create">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEdit" max-width="500" persistent>
      <v-card>
        <v-card-title>Edit bank transfer</v-card-title>
        <v-card-text>
          <v-text-field v-model="editForm.name" label="Name" variant="outlined" class="mb-2" />
          <v-text-field v-model="editForm.account_name" label="Account name" variant="outlined" class="mb-2" />
          <v-text-field v-model="editForm.account_number" label="Account number" variant="outlined" class="mb-2" />
          <v-text-field v-model="editForm.bank_name" label="Bank name" variant="outlined" class="mb-2" />
          <v-switch v-model="editForm.is_active" label="Active" color="primary" hide-details class="mb-2" />
          <div class="d-flex align-center ga-2 mb-2">
            <v-btn size="small" variant="outlined" prepend-icon="mdi-image-search-outline" @click="openQrPicker('edit')">
              Choose QR image
            </v-btn>
            <v-btn
              v-if="editForm.image_path"
              size="small"
              variant="text"
              color="error"
              @click="editForm.image_path = ''"
            >
              Clear
            </v-btn>
          </div>
          <v-img v-if="editForm.image_path" :src="imageUrl(editForm.image_path)" width="96" height="96" cover class="rounded border mb-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEdit = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingEdit" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <StorageImagePickerDialog
      v-model="showQrPickerDialog"
      :selected-path="currentQrPath"
      @selected="onQrSelected"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const methods = ref<any[]>([])
const showCreate = ref(false)
const showEdit = ref(false)
const showQrPickerDialog = ref(false)
const qrPickerMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const saving = ref(false)
const savingEdit = ref(false)
const createForm = reactive({ name: '', account_name: '', account_number: '', bank_name: '', image_path: '' })
const editForm = reactive({ name: '', account_name: '', account_number: '', bank_name: '', image_path: '', is_active: true })
const currentQrPath = computed(() => qrPickerMode.value === 'create' ? createForm.image_path : editForm.image_path)

function imageUrl(path: string) {
  if (!path)
    return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

async function load() {
  const { data } = await supabase.from('payment_methods').select('*').order('sort_order')
  methods.value = data ?? []
}

function openQrPicker(mode: 'create' | 'edit') {
  qrPickerMode.value = mode
  showQrPickerDialog.value = true
}

function onQrSelected(path: string) {
  if (!path)
    return
  if (qrPickerMode.value === 'create')
    createForm.image_path = path
  else
    editForm.image_path = path
}

async function create() {
  if (!createForm.name.trim())
    return
  if (!createForm.account_name.trim() || !createForm.account_number.trim())
    return
  saving.value = true
  try {
    await $fetch('/api/admin/payment-methods', {
      method: 'POST',
      body: {
        type: 'bank_transfer',
        name: createForm.name.trim(),
        account_name: createForm.account_name.trim(),
        account_number: createForm.account_number.trim(),
        bank_name: createForm.bank_name.trim() || null,
        image_path: createForm.image_path || null,
      },
    })
    showCreate.value = false
    createForm.name = ''
    createForm.account_name = ''
    createForm.account_number = ''
    createForm.bank_name = ''
    createForm.image_path = ''
    await load()
  }
  finally {
    saving.value = false
  }
}

function openEdit(pm: any) {
  if (pm?.type !== 'bank_transfer')
    return
  editingId.value = String(pm.id)
  editForm.name = String(pm.name ?? '')
  editForm.account_name = String(pm.account_name ?? '')
  editForm.account_number = String(pm.account_number ?? '')
  editForm.bank_name = String(pm.bank_name ?? '')
  editForm.image_path = String(pm.image_path ?? '')
  editForm.is_active = pm.is_active !== false
  showEdit.value = true
}

async function saveEdit() {
  if (!editingId.value)
    return
  if (!editForm.name.trim() || !editForm.account_name.trim() || !editForm.account_number.trim())
    return

  savingEdit.value = true
  try {
    await $fetch(`/api/admin/payment-methods/${editingId.value}`, {
      method: 'PUT',
      body: {
        name: editForm.name.trim(),
        account_name: editForm.account_name.trim(),
        account_number: editForm.account_number.trim(),
        bank_name: editForm.bank_name.trim() || null,
        image_path: editForm.image_path || null,
        is_active: editForm.is_active,
      },
    })
    showEdit.value = false
    editingId.value = null
    await load()
  }
  finally {
    savingEdit.value = false
  }
}

onMounted(load)
</script>
