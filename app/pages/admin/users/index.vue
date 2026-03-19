<template>
  <div>
    <h1 class="text-h4 mb-4">
      User Management
    </h1>

    <v-btn color="primary" class="mb-4" @click="showCreateDialog = true">
      Create Account
    </v-btn>

    <v-card>
      <v-card-title class="d-flex align-center flex-wrap gap-2">
        <span>Users</span>
        <v-spacer />
        <v-text-field
          v-model="search"
          label="Search by name, email or mobile"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          style="max-width: 340px"
        />
      </v-card-title>

      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="pageSize"
        :headers="headers"
        :items="users"
        :items-length="total"
        :loading="loading"
        item-value="id"
        class="users-table"
      >
        <template #header.full_name>
          <div class="users-col-name">Name</div>
        </template>
        <template #header.email>
          <div class="users-col-email">Email</div>
        </template>
        <template #header.mobile_number>
          <div class="users-col-mobile">Mobile</div>
        </template>
        <template #header.created_at>
          <div class="users-col-created">Created</div>
        </template>
        <template #header.wallet_balance>
          <div class="users-col-wallet">Wallet</div>
        </template>
        <template #header.actions>
          <div class="users-col-actions">Actions</div>
        </template>
        <template #item.role="{ item }">
          <v-chip size="small" color="primary" variant="tonal" class="text-capitalize">
            {{ item.role }}
          </v-chip>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="item.status === 'active' ? 'success' : 'warning'" variant="tonal" class="text-capitalize">
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.email="{ item }">
          <div class="users-col-email">{{ item.email }}</div>
        </template>
        <template #item.mobile_number="{ item }">
          <div class="users-col-mobile">{{ item.mobile_number || '–' }}</div>
        </template>
        <template #item.full_name="{ item }">
          <div class="d-flex align-center ga-2 users-col-name">
            <v-avatar size="28" color="grey-lighten-3">
              <v-img v-if="item.avatar_url" :src="storageImageUrl(item.avatar_url)" cover />
              <v-icon v-else size="16">mdi-account</v-icon>
            </v-avatar>
            <span>{{ item.full_name || '—' }}</span>
          </div>
        </template>
        <template #item.created_at="{ item }">
          <div class="users-col-created">{{ formatDate(item.created_at) }}</div>
        </template>
        <template #item.wallet_balance="{ item }">
          <div class="users-col-wallet">{{ formatPrice(Number(item.wallet_balance ?? 0)) }}</div>
        </template>
        <template #item.actions="{ item }">
          <div class="users-col-actions">
            <v-btn
              v-if="canManageUser(item)"
              size="x-small"
              variant="text"
              icon="mdi-pencil"
              :title="'Edit user'"
              @click="openEditDialog(item)"
            />
            <v-btn
              v-if="canActOnBehalf(item)"
              size="x-small"
              variant="text"
              icon="mdi-account-switch"
              :title="'Sign in on behalf'"
              @click="signInOnBehalf(item)"
            />
            <v-btn
              v-if="actorRole === 'superadmin'"
              size="x-small"
              variant="text"
              icon="mdi-wallet"
              :title="'Update wallet'"
              @click="openWalletDialog(item)"
            />
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="showEditDialog" max-width="520">
      <v-card>
        <v-card-title>Edit user</v-card-title>
        <v-card-text>
          <div class="user-avatar-picker mb-4">
            <v-avatar size="84" color="grey-lighten-3" class="mb-2">
              <v-img v-if="editForm.avatar_url" :src="storageImageUrl(editForm.avatar_url)" cover />
              <v-icon v-else size="34" color="grey">mdi-account-outline</v-icon>
            </v-avatar>
            <div class="d-flex align-center justify-center ga-2">
              <v-btn size="small" variant="outlined" @click="openAvatarPicker('edit')">
                Choose Profile Image
              </v-btn>
              <v-btn
                v-if="editForm.avatar_url"
                size="small"
                variant="text"
                color="error"
                @click="editForm.avatar_url = ''"
              >
                Clear
              </v-btn>
            </div>
          </div>
          <p class="text-caption text-medium-emphasis mb-2">
            {{ editTarget?.email }}
          </p>
          <v-text-field v-model="editForm.full_name" label="Full name" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="editForm.email" label="Email" type="email" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="editForm.mobile_number" label="Mobile number (optional)" variant="outlined" density="compact" class="mb-2" />
          <v-text-field
            v-model="editForm.password"
            label="Password (optional)"
            type="password"
            variant="outlined"
            density="compact"
            hint="Leave empty to keep current password."
            class="mb-2"
          />
          <v-select
            v-model="editForm.role"
            :items="roleOptions"
            label="Role"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-select
            v-model="editForm.status"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="compact"
          />
          <v-checkbox
            v-if="canToggleMobileLoginForEdit"
            v-model="editForm.is_mobile_logged_in"
            label="Mobile Login"
            density="compact"
            hide-details
            class="mt-1"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="editing" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCreateDialog" max-width="760">
      <v-card>
        <v-card-title>Create Account</v-card-title>
        <v-card-text>
          <div class="user-avatar-picker mb-4">
            <v-avatar size="84" color="grey-lighten-3" class="mb-2">
              <v-img v-if="form.avatar_url" :src="storageImageUrl(form.avatar_url)" cover />
              <v-icon v-else size="34" color="grey">mdi-account-outline</v-icon>
            </v-avatar>
            <div class="d-flex align-center justify-center ga-2">
              <v-btn size="small" variant="outlined" @click="openAvatarPicker('create')">
                Choose Profile Image
              </v-btn>
              <v-btn
                v-if="form.avatar_url"
                size="small"
                variant="text"
                color="error"
                @click="form.avatar_url = ''"
              >
                Clear
              </v-btn>
            </div>
          </div>
          <v-row class="mt-1">
            <v-col cols="12" md="6">
              <v-text-field v-model="form.full_name" label="Full name" variant="outlined" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.mobile_number" label="Mobile number (optional)" variant="outlined" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.password" label="Password" type="password" variant="outlined" density="compact" hint="Min 6 characters" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.role" :items="roleOptions" label="Role" variant="outlined" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.status" :items="statusOptions" label="Status" variant="outlined" density="compact" hide-details="auto" />
            </v-col>
            <v-col v-if="canToggleMobileLoginForCreate" cols="12" md="6">
              <v-checkbox
                v-model="form.is_mobile_logged_in"
                label="Mobile Login"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="creating" @click="showCreateDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="creating" @click="createUser">
            Create user
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showWalletDialog" max-width="420">
      <v-card>
        <v-card-title>Update wallet</v-card-title>
        <v-card-text>
          <p class="text-caption text-medium-emphasis mb-2">
            {{ walletTarget?.email }}
          </p>
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-medium-emphasis">Current Balance</span>
            <strong>{{ formatPrice(Number(walletTarget?.wallet_balance ?? 0)) }}</strong>
          </div>
          <v-text-field
            v-model.number="walletForm.amount"
            type="number"
            min="0"
            step="1"
            label="Add Wallet Amount"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showWalletDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="walletSaving" @click="saveWallet">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
    </v-snackbar>
    <StorageImagePickerDialog
      v-model="showAvatarPicker"
      :selected-path="currentAvatarPath"
      @selected="onAvatarSelected"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
const { formatPrice } = usePricingFormat()

interface UserRow {
  id: string
  email: string
  full_name: string | null
  avatar_url?: string | null
  mobile_number?: string | null
  is_mobile_logged_in?: boolean
  role: string
  status: string
  wallet_balance?: number
  created_at: string
}

const headers = [
  { title: 'Name', key: 'full_name' },
  { title: 'Email', key: 'email' },
  { title: 'Mobile', key: 'mobile_number' },
  { title: 'Role', key: 'role' },
  { title: 'Status', key: 'status' },
  { title: 'Wallet', key: 'wallet_balance' },
  { title: 'Created', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const search = ref('')
const config = useRuntimeConfig()
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const users = ref<UserRow[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

const actorRole = ref<'superadmin' | 'admin' | null>(null)
const actorId = ref<string | null>(null)
const roleOptions = computed(() => {
  if (actorRole.value === 'superadmin')
    return ['admin', 'staff', 'member']
  return ['staff', 'member']
})
const statusOptions = ['active', 'inactive']

const form = reactive({
  full_name: '',
  avatar_url: '',
  email: '',
  mobile_number: '',
  is_mobile_logged_in: false,
  password: '',
  role: 'staff',
  status: 'active',
})

const creating = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editing = ref(false)
const editTarget = ref<UserRow | null>(null)
const editForm = reactive({
  full_name: '',
  avatar_url: '',
  email: '',
  mobile_number: '',
  is_mobile_logged_in: false,
  password: '',
  role: 'staff',
  status: 'active',
})
const showWalletDialog = ref(false)
const walletSaving = ref(false)
const walletTarget = ref<UserRow | null>(null)
const walletForm = reactive({ amount: 0 })
const snackbar = reactive({ show: false, message: '', color: 'success' })
const showAvatarPicker = ref(false)
const avatarPickerMode = ref<'create' | 'edit'>('create')
const currentAvatarPath = computed(() => avatarPickerMode.value === 'create' ? form.avatar_url : editForm.avatar_url)

function storageImageUrl(path: string) {
  if (!path)
    return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

function openAvatarPicker(mode: 'create' | 'edit') {
  avatarPickerMode.value = mode
  showAvatarPicker.value = true
}

function onAvatarSelected(path: string) {
  if (!path)
    return
  if (avatarPickerMode.value === 'create')
    form.avatar_url = path
  else
    editForm.avatar_url = path
}

function showToast(message: string, color: 'success' | 'error') {
  snackbar.show = true
  snackbar.message = message
  snackbar.color = color
}

function canManageUser(user: UserRow) {
  return roleOptions.value.includes(user.role)
}

function canActOnBehalf(user: UserRow) {
  if (actorRole.value !== 'superadmin')
    return false
  if (!user?.id || user.id === actorId.value)
    return false
  return user.role !== 'superadmin'
}

const canToggleMobileLoginForCreate = computed(() =>
  actorRole.value === 'superadmin' && form.role === 'member',
)

const canToggleMobileLoginForEdit = computed(() =>
  actorRole.value === 'superadmin' && editForm.role === 'member',
)

function formatDate(value: string) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function loadUsers() {
  loading.value = true
  try {
    const data = await $fetch<{ items: UserRow[]; total: number }>('/api/admin/users', {
      query: {
        search: search.value,
        page: page.value,
        pageSize: pageSize.value,
      },
    })
    users.value = data.items ?? []
    total.value = data.total ?? 0
  }
  catch (e: any) {
    showToast(e?.data?.message ?? e?.message ?? 'Failed to load users.', 'error')
  }
  finally {
    loading.value = false
  }
}

async function createUser() {
  if (!form.full_name.trim() || !form.email || !form.password || !form.role) {
    showToast('Full name, email, password and role are required.', 'error')
    return
  }

  creating.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        full_name: form.full_name.trim(),
        avatar_url: form.avatar_url || null,
        mobile_number: form.mobile_number.trim() || null,
        is_mobile_logged_in: canToggleMobileLoginForCreate.value ? Boolean(form.is_mobile_logged_in) : false,
        role: form.role,
        status: form.status,
      },
    })
    showToast('User account created.', 'success')
    form.full_name = ''
    form.avatar_url = ''
    form.email = ''
    form.mobile_number = ''
    form.is_mobile_logged_in = false
    form.password = ''
    form.role = roleOptions.value[0] ?? 'staff'
    form.status = 'active'
    showCreateDialog.value = false
    page.value = 1
    await loadUsers()
  }
  catch (e: any) {
    showToast(e?.data?.message ?? e?.message ?? 'Failed to create user.', 'error')
  }
  finally {
    creating.value = false
  }
}

function openEditDialog(user: UserRow) {
  if (!canManageUser(user)) {
    showToast('You cannot manage this user role.', 'error')
    return
  }
  editTarget.value = user
  editForm.full_name = user.full_name ?? ''
  editForm.avatar_url = user.avatar_url ?? ''
  editForm.email = user.email
  editForm.mobile_number = user.mobile_number ?? ''
  editForm.is_mobile_logged_in = Boolean(user.is_mobile_logged_in)
  editForm.password = ''
  editForm.role = user.role
  editForm.status = user.status
  showEditDialog.value = true
}

async function saveEdit() {
  if (!editTarget.value)
    return
  if (!editForm.email.trim()) {
    showToast('Email is required.', 'error')
    return
  }

  editing.value = true
  try {
    const body: Record<string, unknown> = {
      email: editForm.email.trim(),
      full_name: editForm.full_name.trim() || null,
      avatar_url: editForm.avatar_url.trim() || null,
      mobile_number: editForm.mobile_number.trim() || null,
      is_mobile_logged_in: canToggleMobileLoginForEdit.value ? Boolean(editForm.is_mobile_logged_in) : false,
      role: editForm.role,
      status: editForm.status,
    }
    if (editForm.password.trim())
      body.password = editForm.password.trim()

    await $fetch(`/api/admin/users/${editTarget.value.id}`, { method: 'PUT', body })
    showEditDialog.value = false
    await loadUsers()
    showToast('User updated.', 'success')
  }
  catch (e: any) {
    showToast(e?.data?.message ?? e?.message ?? 'Failed to update user.', 'error')
  }
  finally {
    editing.value = false
  }
}

async function signInOnBehalf(user: UserRow) {
  if (!canActOnBehalf(user))
    return
  try {
    await $fetch('/api/auth/on-behalf', {
      method: 'PUT',
      body: { user_id: user.id },
    })
    const home = user.role === 'staff' ? '/staff' : user.role === 'member' ? '/member' : '/admin'
    await navigateTo(home, { replace: true })
  }
  catch (e: any) {
    showToast(e?.data?.message ?? e?.message ?? 'Failed to sign in on behalf.', 'error')
  }
}

function openWalletDialog(user: UserRow) {
  walletTarget.value = user
  walletForm.amount = 0
  showWalletDialog.value = true
}

async function saveWallet() {
  if (!walletTarget.value) return
  if (Number(walletForm.amount || 0) <= 0) {
    showToast('Add amount must be greater than 0.', 'error')
    return
  }
  walletSaving.value = true
  try {
    await $fetch(`/api/admin/users/${walletTarget.value.id}/wallet`, {
      method: 'PUT',
      body: { wallet_amount: Number(walletForm.amount || 0) },
    })
    showWalletDialog.value = false
    await loadUsers()
    showToast('Wallet updated.', 'success')
  }
  catch (e: any) {
    showToast(e?.data?.message ?? e?.message ?? 'Failed to update wallet.', 'error')
  }
  finally {
    walletSaving.value = false
  }
}

watch([page, pageSize], () => {
  loadUsers()
})

watch(search, () => {
  page.value = 1
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadUsers()
  }, 350)
})

watch(() => form.role, (role) => {
  if (role !== 'member')
    form.is_mobile_logged_in = false
})

watch(() => editForm.role, (role) => {
  if (role !== 'member')
    editForm.is_mobile_logged_in = false
})

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  actorId.value = profile?.id ?? null
  actorRole.value = (profile?.role === 'superadmin' || profile?.role === 'admin') ? profile.role : 'admin'
  form.role = roleOptions.value[0] ?? 'staff'
  await loadUsers()
})
</script>

<style scoped>
.user-avatar-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.v-data-table__wrapper table th:nth-child(1)),
:deep(.v-data-table__wrapper table td:nth-child(1)),
:deep(.v-data-table__wrapper table th:nth-child(2)),
:deep(.v-data-table__wrapper table td:nth-child(2)) {
  white-space: nowrap;
}

.users-col-name {
  width: 260px;
  min-width: 260px;
  white-space: nowrap;
}

.users-col-email {
  width: 260px;
  min-width: 260px;
  white-space: nowrap;
}

.users-col-created {
  width: 240px;
  min-width: 240px;
  white-space: nowrap;
}

.users-col-mobile {
  width: 200px;
  min-width: 200px;
  white-space: nowrap;
}

.users-col-wallet {
  width: 150px;
  min-width: 150px;
  white-space: nowrap;
}

.users-col-actions {
  width: 100px;
  min-width: 100px;
  white-space: nowrap;
}
</style>
