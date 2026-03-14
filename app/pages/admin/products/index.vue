<template>
  <div>
    <h1 class="text-h4 mb-4">
      Products
    </h1>
    <v-btn color="primary" class="mb-4" :to="'/admin/products/new'">
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
            <v-btn size="small" variant="text" :to="`/admin/products/${p.id}`">
              Edit
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

const products = ref<any[]>([])

async function load() {
  const data = await $fetch<any[]>('/api/admin/products')
  products.value = data ?? []
}

onMounted(load)
</script>
