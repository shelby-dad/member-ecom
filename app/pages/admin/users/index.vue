<template>
  <div>
    <h1 class="text-h4 mb-4">
      User Management
    </h1>

    <v-card class="mb-4">
      <v-card-title>Create Account</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.full_name" label="Full name" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="form.password" label="Password" type="password" variant="outlined" density="comfortable" hint="Min 6 characters" persistent-hint />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="form.role" :items="roleOptions" label="Role" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="form.status" :items="statusOptions" label="Status" variant="outlined" density="comfortable" />
          </v-col>
        </v-row>
        <div class="d-flex justify-end">
          <v-btn color="primary" :loading="creating" @click="createUser">
            Create user
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title class="d-flex align-center flex-wrap gap-2">
        <span>Users</span>
        <v-spacer />
        <v-text-field
          v-model="search"
          label="Search by name or email"
          variant="outlined"
          density="comfortable"
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
      >
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
        <template #item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>
        <template #item.wallet_balance="{ item }">
          {{ Number(item.wallet_balance ?? 0).toFixed(2) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn v-if="actorRole === 'superadmin'" size="x-small" variant="text" @click="openWalletDialog(item)">
            Update wallet
          </v-btn>
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="showWalletDialog" max-width="420">
      <v-card>
        <v-card-title>Update wallet</v-card-title>
        <v-card-text>
          <p class="text-caption text-medium-emphasis mb-2">
            {{ walletTarget?.email }}
          </p>
          <v-text-field
            v-model.number="walletForm.amount"
            type="number"
            min="0"
            step="0.01"
            label="Wallet balance"
            variant="outlined"
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  wallet_balance?: number
  created_at: string
}

const headers = [
  { title: 'Name', key: 'full_name' },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Status', key: 'status' },
  { title: 'Wallet', key: 'wallet_balance' },
  { title: 'Created', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const users = ref<UserRow[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

const actorRole = ref<'superadmin' | 'admin' | null>(null)
const roleOptions = computed(() => {
  if (actorRole.value === 'superadmin')
    return ['admin', 'staff', 'member']
  return ['staff', 'member']
})
const statusOptions = ['active', 'inactive']

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  role: 'staff',
  status: 'active',
})

const creating = ref(false)
const showWalletDialog = ref(false)
const walletSaving = ref(false)
const walletTarget = ref<UserRow | null>(null)
const walletForm = reactive({ amount: 0 })
const snackbar = reactive({ show: false, message: '', color: 'success' })

function showToast(message: string, color: 'success' | 'error') {
  snackbar.show = true
  snackbar.message = message
  snackbar.color = color
}

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
  if (!form.email || !form.password || !form.role) {
    showToast('Email, password and role are required.', 'error')
    return
  }

  creating.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        full_name: form.full_name || undefined,
        role: form.role,
        status: form.status,
      },
    })
    showToast('User account created.', 'success')
    form.full_name = ''
    form.email = ''
    form.password = ''
    form.role = roleOptions.value[0] ?? 'staff'
    form.status = 'active'
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

function openWalletDialog(user: UserRow) {
  walletTarget.value = user
  walletForm.amount = Number(user.wallet_balance ?? 0)
  showWalletDialog.value = true
}

async function saveWallet() {
  if (!walletTarget.value) return
  walletSaving.value = true
  try {
    await $fetch(`/api/admin/users/${walletTarget.value.id}/wallet`, {
      method: 'PUT',
      body: { wallet_balance: Number(walletForm.amount || 0) },
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

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  actorRole.value = (profile?.role === 'superadmin' || profile?.role === 'admin') ? profile.role : 'admin'
  form.role = roleOptions.value[0] ?? 'staff'
  await loadUsers()
})
</script>
