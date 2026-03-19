<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    location="bottom start"
  >
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :model-value="displayValue"
        variant="outlined"
        density="compact"
        hide-details
        readonly
        clearable
        prepend-inner-icon="mdi-calendar-range"
        :style="fieldStyle"
        @click:clear="clearRange"
      />
    </template>
    <v-card>
      <v-date-picker
        v-model="pickerValue"
        multiple="range"
        hide-header
        color="primary"
        show-adjacent-months
      />
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
type RangeValue = {
  start: string | null
  end: string | null
}

const props = withDefaults(defineProps<{
  modelValue: RangeValue
  label?: string
  maxWidth?: string
  valueFormat?: 'ymd' | 'iso'
  emitOnClose?: boolean
}>(), {
  label: 'Date range',
  maxWidth: '250px',
  valueFormat: 'ymd',
  emitOnClose: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: RangeValue): void
}>()

const menu = ref(false)
const pickerValue = ref<any[]>([])
const pendingValue = ref<RangeValue>({ start: null, end: null })

const fieldStyle = computed(() => `max-width: ${props.maxWidth}`)

function parseDate(value: unknown) {
  if (!value) return null
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseModelDate(value: string | null | undefined) {
  const raw = String(value ?? '').trim()
  if (!raw)
    return null
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymdMatch) {
    const year = Number(ymdMatch[1])
    const month = Number(ymdMatch[2]) - 1
    const day = Number(ymdMatch[3])
    return new Date(Date.UTC(year, month, day))
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizePicked(values: unknown[]) {
  const normalized = values
    .map(parseDate)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())
  if (!normalized.length) return { start: null, end: null }
  return {
    start: normalized[0],
    end: normalized[normalized.length - 1] ?? normalized[0],
  }
}

function toYmd(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toIsoStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
  return d.toISOString()
}

function toIsoEnd(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
  return d.toISOString()
}

function formatOutput(start: Date | null, end: Date | null): RangeValue {
  if (!start || !end)
    return { start: null, end: null }
  if (props.valueFormat === 'iso') {
    return {
      start: toIsoStart(start),
      end: toIsoEnd(end),
    }
  }
  return {
    start: toYmd(start),
    end: toYmd(end),
  }
}

function clearRange() {
  pickerValue.value = []
  pendingValue.value = { start: null, end: null }
  emit('update:modelValue', { start: null, end: null })
}

function formatDisplayDate(value: string | null | undefined) {
  const date = parseModelDate(value)
  if (!date)
    return ''
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

const displayValue = computed(() => {
  const start = props.modelValue?.start
  const end = props.modelValue?.end
  if (!start || !end) return ''
  const left = formatDisplayDate(start)
  const right = formatDisplayDate(end)
  if (!left || !right)
    return ''
  if (left === right)
    return left
  return `${left} - ${right}`
})

watch(() => props.modelValue, (value) => {
  if (!value?.start || !value?.end) {
    pickerValue.value = []
    pendingValue.value = { start: null, end: null }
    return
  }
  pickerValue.value = [value.start, value.end]
  pendingValue.value = { start: value.start, end: value.end }
}, { immediate: true, deep: true })

watch(pickerValue, (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    pendingValue.value = { start: null, end: null }
    if (!props.emitOnClose)
      emit('update:modelValue', { start: null, end: null })
    return
  }
  const normalized = normalizePicked(value)
  pendingValue.value = formatOutput(normalized.start, normalized.end)
  if (!props.emitOnClose)
    emit('update:modelValue', pendingValue.value)
  if (menu.value && normalized.start && normalized.end && value.length >= 2)
    menu.value = false
}, { deep: true })

watch(menu, (open) => {
  if (!open && props.emitOnClose)
    emit('update:modelValue', pendingValue.value)
})
</script>
