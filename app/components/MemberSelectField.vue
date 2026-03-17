<template>
  <v-autocomplete
    v-model="internalValue"
    v-model:search="search"
    :items="items"
    item-title="display_name"
    item-value="id"
    :label="label"
    :variant="variant"
    :density="density"
    :hide-details="hideDetails"
    :loading="loading"
    clearable
    no-filter
    @update:model-value="onModelValueChanged"
    @focus="onFocus"
  >
    <template #item="{ props, item }">
      <v-list-item v-bind="props" :title="item.raw.display_name" :subtitle="item.raw.email" />
    </template>
    <template #append-item>
      <div
        v-if="hasMore"
        v-intersect="onBottomIntersect"
        class="d-flex justify-center py-3"
      >
        <v-progress-circular indeterminate size="18" />
      </div>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
type Member = {
  id: string
  full_name: string | null
  email: string
  wallet_balance: number | null
  display_name: string
}

type MembersResponse = {
  items: Array<{
    id: string
    full_name: string | null
    email: string
    wallet_balance: number | null
  }>
  total: number
  page: number
  per_page: number
}

const props = withDefaults(defineProps<{
  modelValue: string | null
  label?: string
  variant?: 'outlined' | 'underlined' | 'filled' | 'plain' | 'solo' | 'solo-filled' | 'solo-inverted'
  density?: 'default' | 'comfortable' | 'compact'
  hideDetails?: boolean | 'auto'
  perPage?: number
}>(), {
  label: 'Select member',
  variant: 'outlined',
  density: 'default',
  hideDetails: false,
  perPage: 20,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'update:member', value: Member | null): void
}>()

const internalValue = ref<string | null>(props.modelValue ?? null)
const search = ref('')
const items = ref<Member[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const hasMore = computed(() => items.value.length < total.value)

function toMember(raw: { id: string, full_name: string | null, email: string, wallet_balance: number | null }): Member {
  return {
    ...raw,
    display_name: (raw.full_name || '').trim() || raw.email,
  }
}

async function loadMembers(targetPage: number, reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const data = await $fetch<MembersResponse>('/api/pos/members', {
      query: {
        q: search.value.trim() || undefined,
        page: targetPage,
        per_page: props.perPage,
      },
    })
    const incoming = (data?.items ?? []).map(toMember)
    if (reset) {
      items.value = incoming
      page.value = 1
    }
    else {
      const map = new Map(items.value.map(member => [member.id, member]))
      for (const member of incoming)
        map.set(member.id, member)
      items.value = [...map.values()]
      page.value = targetPage
    }
    total.value = Number(data?.total ?? items.value.length)
  }
  finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  await loadMembers(page.value + 1, false)
}

function emitSelectedMember(id: string | null) {
  if (!id) {
    emit('update:member', null)
    return
  }
  const selected = items.value.find(member => member.id === id) ?? null
  emit('update:member', selected)
}

function onModelValueChanged(value: string | null) {
  emit('update:modelValue', value)
  emitSelectedMember(value)
}

function onBottomIntersect(isIntersecting: boolean) {
  if (isIntersecting)
    loadMore()
}

function onFocus() {
  if (!items.value.length && !loading.value)
    loadMembers(1, true)
}

watch(() => props.modelValue, (value) => {
  internalValue.value = value ?? null
  emitSelectedMember(internalValue.value)
})

watch(search, () => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadMembers(1, true)
  }, 250)
})

onMounted(() => {
  loadMembers(1, true)
})

onBeforeUnmount(() => {
  if (searchTimer)
    clearTimeout(searchTimer)
})
</script>
