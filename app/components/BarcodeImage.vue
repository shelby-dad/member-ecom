<template>
  <div class="barcode-wrap">
    <svg v-if="value" ref="svgEl" class="barcode-svg" />
    <span v-else class="text-medium-emphasis">-</span>
  </div>
</template>

<script setup lang="ts">
import JsBarcode from 'jsbarcode'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  value?: string | null
}>(), {
  value: '',
})

const svgEl = ref<SVGSVGElement | null>(null)
const theme = useTheme()
const isDarkTheme = computed(() => theme.global.current.value.dark)

function detectFormat(value: string) {
  const trimmed = value.trim()
  const digitsOnly = /^\d+$/.test(trimmed)
  if (digitsOnly && trimmed.length === 13)
    return 'EAN13'
  if (digitsOnly && trimmed.length === 12)
    return 'UPC'
  return 'CODE128'
}

function renderBarcode() {
  if (!import.meta.client) return
  const el = svgEl.value
  const value = String(props.value ?? '').trim()
  if (!el || !value) return
  try {
    JsBarcode(el, value, {
      format: detectFormat(value),
      displayValue: false,
      margin: 0,
      height: 34,
      width: 1.5,
      background: 'transparent',
      lineColor: isDarkTheme.value ? '#F8FAFC' : '#111827',
    })
  }
  catch {
    el.innerHTML = ''
  }
}

watch(() => props.value, () => {
  nextTick(renderBarcode)
}, { immediate: true })

watch(isDarkTheme, () => {
  nextTick(renderBarcode)
})

onMounted(() => {
  renderBarcode()
})
</script>

<style scoped>
.barcode-wrap {
  min-width: 140px;
  min-height: 36px;
  display: flex;
  align-items: center;
}

.barcode-svg {
  width: 140px;
  height: 36px;
}
</style>
