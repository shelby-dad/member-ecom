import type { SupabaseClient } from '@supabase/supabase-js'

/** Ensure one stock row exists for variant (branch_id NULL). Idempotent; only inserts when missing. */
export async function ensureStockRow(supabase: SupabaseClient, variantId: string, initialQuantity = 0) {
  const { data: existing, error: existingError } = await supabase
    .from('stock')
    .select('id, quantity')
    .eq('variant_id', variantId)
    .is('branch_id', null)
  if (existingError) throw existingError

  const rows = existing ?? []
  if (rows.length === 1) return
  if (rows.length > 1) {
    const totalQty = rows.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0)
    const keeper = rows[0]
    await supabase.from('stock').update({ quantity: totalQty }).eq('id', keeper.id)
    const duplicateIds = rows.slice(1).map((r: any) => r.id)
    if (duplicateIds.length)
      await supabase.from('stock').delete().in('id', duplicateIds)
    return
  }

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
  const { data: rows, error: existingError } = await supabase
    .from('stock')
    .select('id, quantity')
    .eq('variant_id', variantId)
    .is('branch_id', branchId)
  if (existingError) throw existingError
  const existingRows = rows ?? []
  const existing = existingRows[0]

  if (existing) {
    const { error: updateError } = await supabase.from('stock').update({ quantity }).eq('id', existing.id)
    if (updateError) throw updateError
    const duplicateIds = existingRows.slice(1).map((r: any) => r.id)
    if (duplicateIds.length)
      await supabase.from('stock').delete().in('id', duplicateIds)
  } else {
    const { error: insertError } = await supabase.from('stock').insert(
      { variant_id: variantId, branch_id: branchId, quantity },
    )
    if (insertError) throw insertError
  }

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
