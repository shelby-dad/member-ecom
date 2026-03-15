export type OptionSetType = 'text' | 'image' | 'color'
export type OptionSetValue = string | { label: string; value: string }
export type OptionSet = { name: string; type?: OptionSetType; values: OptionSetValue[] }
export type NormalizedOptionSet = { name: string; type: OptionSetType; values: { label: string; value: string }[] }

export function normalizeOptionSets(optionSets: OptionSet[]): NormalizedOptionSet[] {
  return optionSets
    .map((set) => {
      const type = (set.type ?? 'text') as OptionSetType
      const values = (set.values ?? [])
        .map((raw) => {
          if (typeof raw === 'string') {
            const clean = raw.trim()
            if (!clean) return null
            return { label: clean, value: clean }
          }

          const label = raw.label?.trim()
          const value = raw.value?.trim()
          if (!label || !value)
            return null
          return { label, value }
        })
        .filter(Boolean) as Array<{ label: string; value: string }>

      if ((type === 'image' || type === 'color') && values.some(v => !v.label || !v.value))
        throw new Error(`Option set '${set.name}' requires both label and value for ${type} entries`)

      return {
        name: set.name.trim(),
        type,
        values,
      }
    })
    .filter(set => set.name && set.values.length > 0)
}

/** Generate all combinations from option sets, e.g. [Size:S,M,L] x [Color:Black,White] => [{Size:S,Color:Black}, ...] */
export function generateOptionCombinations(optionSets: OptionSet[]): Record<string, string>[] {
  const sets = normalizeOptionSets(optionSets)
  if (sets.length === 0) return []
  const [first, ...rest] = sets
  const restCombos = rest.length > 0 ? generateOptionCombinations(rest) : [{}]
  const result: Record<string, string>[] = []
  for (const value of first.values) {
    for (const combo of restCombos) {
      result.push({ [first.name]: value.label, ...combo })
    }
  }
  return result
}

/** Format option_values to display name, e.g. { Size: "M", Color: "Black" } => "Black / M" (option set order) */
export function optionValuesToName(optionValues: Record<string, string>, optionSetOrder?: string[]): string {
  const keys = optionSetOrder?.length ? optionSetOrder : Object.keys(optionValues).sort()
  return keys.map(k => optionValues[k]).filter(Boolean).join(' / ')
}

export function generateVariantSku(productSlug: string, optionValues?: Record<string, string> | null): string {
  const prefix = (productSlug || 'sku').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SKU'
  const optionToken = Object.values(optionValues ?? {})
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase())
    .join('')
    .slice(0, 6)
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${prefix}${optionToken ? `-${optionToken}` : ''}-${rand}`
}
