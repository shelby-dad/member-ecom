<template>
  <div class="chart-wrap">
    <div class="chart-columns">
      <div v-for="(item, idx) in limitedItems" :key="`${item.label}-${idx}`" class="chart-col">
        <div class="chart-bars">
          <div
            class="chart-bar chart-bar--left"
            :style="{ height: `${leftPercent(item.left)}%`, '--bar-color': leftColor }"
          />
          <div
            v-if="hasRightSeries"
            class="chart-bar chart-bar--right"
            :style="{ height: `${rightPercent(item.right)}%`, '--bar-color': rightColor }"
          />
        </div>
        <div class="chart-label" :title="item.label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: Array<{ label: string; left: number; right?: number }>
  leftColor?: string
  rightColor?: string
  maxPoints?: number
}>(), {
  leftColor: '#2563eb',
  rightColor: '#f97316',
  maxPoints: 16,
})

const limitedItems = computed(() => {
  if (props.items.length <= props.maxPoints)
    return props.items
  return props.items.slice(props.items.length - props.maxPoints)
})

const hasRightSeries = computed(() => limitedItems.value.some(i => Number(i.right ?? 0) > 0))
const maxLeft = computed(() => Math.max(1, ...limitedItems.value.map(i => Number(i.left || 0))))
const maxRight = computed(() => Math.max(1, ...limitedItems.value.map(i => Number(i.right || 0))))

function leftPercent(value: number) {
  return Math.max(0, Math.min(100, (Number(value || 0) / maxLeft.value) * 100))
}

function rightPercent(value?: number) {
  return Math.max(0, Math.min(100, (Number(value || 0) / maxRight.value) * 100))
}
</script>

<style scoped>
.chart-wrap {
  width: 100%;
  overflow-x: auto;
}

.chart-columns {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(42px, 1fr);
  align-items: end;
  gap: 10px;
  min-height: 170px;
}

.chart-col {
  display: grid;
  gap: 6px;
}

.chart-bars {
  height: 136px;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 3px;
}

.chart-bar {
  width: 10px;
  border-radius: 6px 6px 2px 2px;
  background: var(--bar-color);
}

.chart-bar--left {
  opacity: 0.96;
}

.chart-bar--right {
  opacity: 0.76;
}

.chart-label {
  text-align: center;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
