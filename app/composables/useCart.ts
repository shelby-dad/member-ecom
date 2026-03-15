export interface CartItem {
  variant_id: string
  product_name: string
  variant_name: string
  price: number
  quantity: number
}

export function useCart() {
  const cartState = useState<CartItem[]>('cart', () => [])
  const items = computed(() => cartState.value)

  const total = computed(() =>
    cartState.value.reduce((sum, i) => sum + i.price * i.quantity, 0),
  )

  const count = computed(() =>
    cartState.value.reduce((sum, i) => sum + i.quantity, 0),
  )

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
    addItem,
    setQuantity,
    removeItem,
    clear,
  }
}
