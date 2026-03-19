<template>
  <div class="d-flex flex-column ga-3">
    <div v-for="item in normalizedItems" :key="item.label" class="bar-row">
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-body-2 text-truncate pr-2">{{ item.label }}</span>
        <span class="text-caption font-weight-medium">{{ item.display }}</span>
      </div>
      <v-progress-linear
        :model-value="item.percent"
        :height="8"
        rounded
        :color="color"
        bg-color="grey-lighten-3"
      />
    </div>
    <p v-if="!normalizedItems.length" class="text-caption text-medium-emphasis mb-0">
      No data
    </p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: Array<{ label: string; value: number }>
  color?: string
  formatter?: (value: number) => string
}>(), {
  color: 'primary',
})

const maxValue = computed(() => Math.max(1, ...props.items.map(i => Number(i.value || 0))))

const normalizedItems = computed(() => {
  return props.items.map((item) => {
    const value = Number(item.value || 0)
    const percent = Math.max(0, Math.min(100, (value / maxValue.value) * 100))
    const display = props.formatter ? props.formatter(value) : value.toLocaleString()
    return {
      label: item.label,
      percent,
      display,
    }
  })
})
</script>

<style scoped>
.bar-row {
  min-width: 0;
}
</style>
