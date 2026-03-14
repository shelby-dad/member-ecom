<template>
  <div>
    <h1 class="text-h4 mb-4">
      Catalog
    </h1>
    <v-row>
      <v-col v-for="p in products" :key="p.id" cols="12" sm="6" md="4">
        <v-card class="app-card" hover @click="goProduct(p.id)">
          <v-img
            v-if="firstImageByProduct[p.id]"
            :src="imageUrl(firstImageByProduct[p.id])"
            height="160"
            cover
            class="align-end"
            gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
          />
          <v-card-title>{{ p.name }}</v-card-title>
          <v-card-text>
            {{ p.description || 'No description' }}
          </v-card-text>
          <v-card-actions>
            <v-btn variant="flat" color="primary" size="small" @click.stop="goProduct(p.id)">
              View
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <p v-if="products.length === 0" class="text-medium-emphasis">
      No products yet.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })

const config = useRuntimeConfig()
const supabase = useSupabaseClient()
const products = ref<any[]>([])
const firstImageByProduct = ref<Record<string, string>>({})

function imageUrl(path: string) {
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

async function load() {
  const { data: list } = await supabase.from('products').select('id, name, description').eq('is_active', true).order('name')
  products.value = list ?? []
  if (list?.length) {
    const ids = list.map(p => p.id)
    const { data: imgs } = await supabase.from('product_images').select('product_id, path').in('product_id', ids).order('sort_order')
    const first: Record<string, string> = {}
    for (const img of imgs ?? []) {
      if (first[img.product_id] == null) first[img.product_id] = img.path
    }
    firstImageByProduct.value = first
  }
}

function goProduct(id: string) {
  navigateTo(`/member/catalog/${id}`)
}

onMounted(load)
</script>
