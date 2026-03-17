<template>
  <v-dialog :model-value="modelValue" max-width="760" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>
        Select variant
      </v-card-title>
      <v-card-subtitle class="pt-1">
        {{ productName }}
      </v-card-subtitle>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Price</th>
              <th>Stock</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="variant in variants" :key="variant.id">
              <td>{{ variant.name }}</td>
              <td>{{ formatPrice(Number(variant.price ?? 0)) }}</td>
              <td>{{ variant.track_stock ? Number(variant.available_stock ?? 0) : '-' }}</td>
              <td class="text-right">
                <v-btn
                  size="small"
                  color="primary"
                  variant="text"
                  :disabled="variant.track_stock && Number(variant.available_stock ?? 0) <= 0"
                  @click="emit('select', variant)"
                >
                  Add
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { formatPrice } = usePricingFormat()

defineProps<{
  modelValue: boolean
  productName: string
  variants: Array<{
    id: string
    name: string
    price: number
    track_stock: boolean
    available_stock: number
  }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', variant: any): void
}>()
</script>
