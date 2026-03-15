<template>
  <div>
    <h1 class="text-h4 mb-4">
      Products
    </h1>
    <v-btn v-if="canManageDetails" color="primary" class="mb-4" :to="'/admin/products/new'">
      Add product
    </v-btn>
    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Variants</th>
          <th>Images</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.slug }}</td>
          <td>{{ p.variant_count ?? 0 }}</td>
          <td>{{ p.image_count ?? 0 }}</td>
          <td>{{ p.is_active ? 'Yes' : 'No' }}</td>
          <td>
            <v-btn v-if="canManageDetails" size="small" variant="text" :to="`/admin/products/${p.id}`">
              Edit
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="error"
              :disabled="!p.is_active"
              :loading="deletingId === p.id"
              @click="openDeleteDialog(p)"
            >
              Delete
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Confirm product deletion</v-card-title>
        <v-card-text>
          This is a soft delete and will set the product to inactive.
          <strong v-if="selectedProduct"> {{ selectedProduct.name }}</strong>
          will no longer appear in active catalog listings.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deletingId !== null" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deletingId === selectedProduct?.id"
            :disabled="!selectedProduct"
            @click="confirmDelete"
          >
            Confirm delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const products = ref<any[]>([])
const showDeleteDialog = ref(false)
const selectedProduct = ref<any | null>(null)
const deletingId = ref<string | null>(null)
const role = ref<'superadmin' | 'admin' | 'staff' | 'member' | null>(null)

const canManageDetails = computed(() => role.value === 'superadmin' || role.value === 'admin')

async function load() {
  const data = await $fetch<any[]>('/api/admin/products')
  products.value = data ?? []
}

function openDeleteDialog(product: any) {
  selectedProduct.value = product
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedProduct.value?.id)
    return

  deletingId.value = selectedProduct.value.id
  try {
    await $fetch(`/api/admin/products/${selectedProduct.value.id}`, { method: 'DELETE' })
    showDeleteDialog.value = false
    selectedProduct.value = null
    await load()
  }
  finally {
    deletingId.value = null
  }
}

onMounted(load)

onMounted(async () => {
  const profile = await useProfile().ensureProfile()
  role.value = profile?.role ?? null
})
</script>
