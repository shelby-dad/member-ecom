export interface PricingSettings {
  pricing_sign: string
  pricing_symbol: string
  pricing_label: string
  pricing_decimals: number
  pricing_symbol_position: 'before' | 'after'
}

const defaultPricingSettings: PricingSettings = {
  pricing_sign: '',
  pricing_symbol: '฿',
  pricing_label: 'Price',
  pricing_decimals: 2,
  pricing_symbol_position: 'before',
}

function formatNumber(value: number, decimals: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function usePricingFormat() {
  const pricing = useState<PricingSettings>('pricing-settings', () => ({ ...defaultPricingSettings }))
  const pricingLoaded = useState<boolean>('pricing-settings-loaded', () => false)

  function formatPrice(value: number) {
    const p = pricing.value
    const decimals = Math.max(0, Math.min(4, Number(p.pricing_decimals || 0)))
    const absNumber = Math.abs(Number(value || 0))
    const num = formatNumber(absNumber, decimals)
    const symbol = p.pricing_symbol || defaultPricingSettings.pricing_symbol
    const positioned = p.pricing_symbol_position === 'after' ? `${num}${symbol}` : `${symbol}${num}`
    const signed = `${p.pricing_sign || ''}${positioned}`
    return Number(value || 0) < 0 ? `-${signed}` : signed
  }

  async function refreshPricingSettings() {
    const data = await $fetch<Partial<PricingSettings>>('/api/settings/public')
    pricing.value = {
      ...defaultPricingSettings,
      ...data,
    }
    pricingLoaded.value = true
  }

  if (!pricingLoaded.value) {
    refreshPricingSettings().catch(() => {
      pricingLoaded.value = true
    })
  }

  return {
    pricing: readonly(pricing),
    formatPrice,
    refreshPricingSettings,
  }
}
