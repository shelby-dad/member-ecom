export interface MemberCartItem {
  variant_id: string
  product_name: string
  variant_name: string
  price: number
  quantity: number
}

function normalizeMemberCartItems(input: unknown): MemberCartItem[] {
  if (!Array.isArray(input))
    return []
  return input
    .map((row: any) => ({
      variant_id: String(row?.variant_id ?? ''),
      product_name: String(row?.product_name ?? ''),
      variant_name: String(row?.variant_name ?? ''),
      price: Number(row?.price ?? 0),
      quantity: Math.max(1, Number(row?.quantity ?? 1)),
    }))
    .filter(row => row.variant_id)
}

export function useMemberCart() {
  const itemsState = useState<MemberCartItem[]>('member-cart:items', () => [])
  const loaded = useState<boolean>('member-cart:loaded', () => false)
  const loading = useState<boolean>('member-cart:loading', () => false)
  const lastContextKey = useState<string>('member-cart:context-key', () => '')

  function getContextKey() {
    if (!import.meta.client)
      return ''
    const user = useSupabaseUser()
    const activeRole = useCookie<string | null>('active-role').value ?? ''
    const onBehalfId = useCookie<string | null>('on-behalf-user-id').value ?? ''
    return `${user.value?.id ?? ''}|${activeRole}|${onBehalfId}`
  }

  const items = computed(() => itemsState.value)
  const total = computed(() =>
    itemsState.value.reduce((sum, i) => sum + i.price * i.quantity, 0),
  )
  const count = computed(() =>
    itemsState.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  async function ensureLoaded(force = false) {
    if (!import.meta.client)
      return
    const contextKey = getContextKey()
    if (contextKey !== lastContextKey.value) {
      lastContextKey.value = contextKey
      loaded.value = false
      itemsState.value = []
    }
    if (loaded.value && !force)
      return
    if (loading.value) {
      while (loading.value)
        await new Promise(resolve => setTimeout(resolve, 20))
      return
    }

    loading.value = true
    try {
      const data = await $fetch<MemberCartItem[]>('/api/member/cart')
      itemsState.value = normalizeMemberCartItems(data)
      loaded.value = true
    }
    catch {
      itemsState.value = []
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function refresh() {
    await ensureLoaded(true)
  }

  async function persistItem(item: MemberCartItem) {
    await $fetch('/api/member/cart/item', {
      method: 'PUT',
      body: item,
    })
  }

  async function addItem(item: Omit<MemberCartItem, 'quantity'> & { quantity?: number }) {
    await ensureLoaded()
    const qty = Math.max(1, Number(item.quantity ?? 1))
    const existing = itemsState.value.find(i => i.variant_id === item.variant_id)
    const next: MemberCartItem = existing
      ? {
          ...existing,
          product_name: item.product_name,
          variant_name: item.variant_name,
          price: Number(item.price ?? existing.price ?? 0),
          quantity: existing.quantity + qty,
        }
      : {
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          price: Number(item.price ?? 0),
          quantity: qty,
        }

    if (existing) {
      itemsState.value = itemsState.value.map(row => row.variant_id === next.variant_id ? next : row)
    }
    else {
      itemsState.value = [...itemsState.value, next]
    }

    try {
      await persistItem(next)
    }
    catch {
      await refresh()
    }
  }

  async function setQuantity(variantId: string, quantity: number) {
    await ensureLoaded()
    const q = Math.max(0, Math.trunc(Number(quantity ?? 0)))
    if (q <= 0) {
      await removeItem(variantId)
      return
    }
    const existing = itemsState.value.find(i => i.variant_id === variantId)
    if (!existing)
      return

    const next = { ...existing, quantity: q }
    itemsState.value = itemsState.value.map(row => row.variant_id === variantId ? next : row)

    try {
      await persistItem(next)
    }
    catch {
      await refresh()
    }
  }

  async function removeItem(variantId: string) {
    await ensureLoaded()
    itemsState.value = itemsState.value.filter(i => i.variant_id !== variantId)
    try {
      await $fetch(`/api/member/cart/${variantId}`, { method: 'DELETE' })
    }
    catch {
      await refresh()
    }
  }

  async function clear() {
    await ensureLoaded()
    const ids = itemsState.value.map(i => i.variant_id)
    itemsState.value = []
    if (!ids.length)
      return
    await Promise.all(ids.map(id => $fetch(`/api/member/cart/${id}`, { method: 'DELETE' })))
  }

  return {
    items,
    total,
    count,
    hydrated: computed(() => loaded.value),
    loading,
    ensureLoaded,
    refresh,
    addItem,
    setQuantity,
    removeItem,
    clear,
  }
}
