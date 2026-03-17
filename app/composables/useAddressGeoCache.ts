type AddressCountry = { id: string, code: string, name: string }
type AddressState = { id: string, country_id: string, code: string | null, name: string }
type AddressCity = { id: string, country_id: string, state_id: string, name: string }

type AddressGeoPayload = {
  countries: AddressCountry[]
  states: AddressState[]
  cities: AddressCity[]
}

type AddressGeoCache = AddressGeoPayload & {
  loadedAt: number
}

const CACHE_TTL_MS = 1000 * 60 * 30

export function useAddressGeoCache() {
  const cache = useState<AddressGeoCache>('address-geo-cache', () => ({
    countries: [],
    states: [],
    cities: [],
    loadedAt: 0,
  }))
  const loading = useState<boolean>('address-geo-cache-loading', () => false)

  async function ensureLoaded(force = false) {
    const isFresh = Date.now() - cache.value.loadedAt < CACHE_TTL_MS
    if (!force && cache.value.countries.length && isFresh)
      return
    if (loading.value)
      return

    loading.value = true
    try {
      const data = await $fetch<AddressGeoPayload>('/api/member/address-geo')
      cache.value = {
        countries: data?.countries ?? [],
        states: data?.states ?? [],
        cities: data?.cities ?? [],
        loadedAt: Date.now(),
      }
    }
    finally {
      loading.value = false
    }
  }

  return {
    countries: computed(() => cache.value.countries),
    states: computed(() => cache.value.states),
    cities: computed(() => cache.value.cities),
    loading: computed(() => loading.value),
    ensureLoaded,
  }
}
