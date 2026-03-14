export type OptionSet = { name: string; values: string[] }

/** Generate all combinations from option sets, e.g. [Size:S,M,L] x [Color:Black,White] => [{Size:S,Color:Black}, ...] */
export function generateOptionCombinations(optionSets: OptionSet[]): Record<string, string>[] {
  if (optionSets.length === 0) return []
  const [first, ...rest] = optionSets
  const restCombos = rest.length > 0 ? generateOptionCombinations(rest) : [{}]
  const result: Record<string, string>[] = []
  for (const value of first.values) {
    for (const combo of restCombos) {
      result.push({ [first.name]: value, ...combo })
    }
  }
  return result
}

/** Format option_values to display name, e.g. { Size: "M", Color: "Black" } => "Black / M" (option set order) */
export function optionValuesToName(optionValues: Record<string, string>, optionSetOrder?: string[]): string {
  const keys = optionSetOrder?.length ? optionSetOrder : Object.keys(optionValues).sort()
  return keys.map(k => optionValues[k]).filter(Boolean).join(' / ')
}
