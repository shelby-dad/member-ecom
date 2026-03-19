export interface CartItem {
  variant_id: string
  product_name: string
  variant_name: string
  price: number
  quantity: number
}

const CART_STORAGE_KEY = 'member_cart_v1'

function normalizeCartItems(input: unknown): CartItem[] {
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

export function useCart() {
  const cartState = useState<CartItem[]>('cart', () => [])
  const cartHydrated = useState<boolean>('cart:hydrated', () => false)
  const cartPersistWatcherReady = useState<boolean>('cart:persist-watcher-ready', () => false)
  const items = computed(() => cartState.value)

  const total = computed(() =>
    cartState.value.reduce((sum, i) => sum + i.price * i.quantity, 0),
  )

  const count = computed(() =>
    cartState.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  if (import.meta.client && !cartHydrated.value) {
    onNuxtReady(() => {
      try {
        const raw = localStorage.getItem(CART_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          cartState.value = normalizeCartItems(parsed)
        }
      }
      catch {
        cartState.value = []
      }
      finally {
        cartHydrated.value = true
      }
    })
  }

  if (import.meta.client && !cartPersistWatcherReady.value) {
    cartPersistWatcherReady.value = true
    watch(
      cartState,
      (value) => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value))
      },
      { deep: true },
    )
  }

  function addItem(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
    const q = item.quantity ?? 1
    const existing = cartState.value.find(i => i.variant_id === item.variant_id)
    if (existing) {
      existing.quantity += q
    }
    else {
      cartState.value = [...cartState.value, { ...item, quantity: q }]
    }
  }

  function setQuantity(variantId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(variantId)
      return
    }
    const existing = cartState.value.find(i => i.variant_id === variantId)
    if (existing)
      existing.quantity = quantity
  }

  function removeItem(variantId: string) {
    cartState.value = cartState.value.filter(i => i.variant_id !== variantId)
  }

  function clear() {
    cartState.value = []
  }

  return {
    items,
    total,
    count,
    hydrated: computed(() => cartHydrated.value),
    addItem,
    setQuantity,
    removeItem,
    clear,
  }
}
