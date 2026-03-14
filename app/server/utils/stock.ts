import type { SupabaseClient } from '@supabase/supabase-js'

/** Ensure one stock row exists for variant (branch_id NULL). Idempotent; only inserts when missing. */
export async function ensureStockRow(supabase: SupabaseClient, variantId: string, initialQuantity = 0) {
  const { data: existing } = await supabase
    .from('stock')
    .select('id')
    .eq('variant_id', variantId)
    .is('branch_id', null)
    .limit(1)
    .maybeSingle()
  if (existing) return
  const { error } = await supabase.from('stock').insert({
    variant_id: variantId,
    branch_id: null,
    quantity: initialQuantity,
  })
  if (error) throw error
}

/** Set quantity and optionally record stock_movements adjustment. */
export async function setStock(
  supabase: SupabaseClient,
  variantId: string,
  quantity: number,
  branchId: string | null = null,
  userId?: string,
) {
  const { data: existing } = await supabase
    .from('stock')
    .select('id, quantity')
    .eq('variant_id', variantId)
    .is('branch_id', branchId)
    .single()

  const { error: upsertError } = await supabase.from('stock').upsert(
    { variant_id: variantId, branch_id: branchId, quantity },
    { onConflict: 'variant_id,branch_id' },
  )
  if (upsertError) throw upsertError

  if (userId && existing != null && existing.quantity !== quantity) {
    const delta = quantity - (existing.quantity ?? 0)
    await supabase.from('stock_movements').insert({
      variant_id: variantId,
      branch_id: branchId,
      movement_type: 'adjustment',
      quantity: Math.abs(delta),
      reference_type: 'adjustment',
      created_by: userId,
    })
  }
}
