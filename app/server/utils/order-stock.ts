import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureStockRow } from '~/server/utils/stock'

type TrackedOrderItem = {
  variant_id: string
  quantity: number
  track_stock?: boolean | null
}

type StockAction = 'reserve' | 'restore'

export async function applyOrderStock(
  supabase: SupabaseClient,
  params: {
    orderId: string
    actorId?: string
    items: TrackedOrderItem[]
    action: StockAction
  },
) {
  const tracked = params.items.filter(i => i.track_stock !== false)
  if (!tracked.length)
    return

  const quantitiesByVariant: Record<string, number> = {}
  for (const item of tracked) {
    quantitiesByVariant[item.variant_id] = (quantitiesByVariant[item.variant_id] ?? 0) + Number(item.quantity ?? 0)
  }

  const applied: Array<{ variantId: string; quantity: number }> = []
  try {
    for (const [variantId, quantity] of Object.entries(quantitiesByVariant)) {
      if (quantity <= 0) continue
      await ensureStockRow(supabase, variantId, 0)

      const { data: stockRows, error: stockError } = await supabase
        .from('stock')
        .select('id, quantity')
        .eq('variant_id', variantId)
        .is('branch_id', null)
      if (stockError)
        throw new Error(stockError?.message ?? 'Stock row not found')
      if (!stockRows?.length)
        throw new Error('Stock row not found')

      const currentQty = stockRows.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0)
      const nextQty = params.action === 'reserve'
        ? currentQty - quantity
        : currentQty + quantity

      if (nextQty < 0)
        throw new Error('Insufficient stock during reservation')

      const keeperId = stockRows[0].id
      const { error: updateError } = await supabase
        .from('stock')
        .update({ quantity: nextQty })
        .eq('id', keeperId)
      if (updateError)
        throw new Error(updateError.message)
      const duplicateIds = stockRows.slice(1).map((row: any) => row.id)
      if (duplicateIds.length) {
        await supabase
          .from('stock')
          .delete()
          .in('id', duplicateIds)
      }

      applied.push({ variantId, quantity })
      await supabase.from('stock_movements').insert({
        variant_id: variantId,
        branch_id: null,
        movement_type: params.action === 'reserve' ? 'out' : 'in',
        quantity,
        reference_type: 'order',
        reference_id: params.orderId,
        created_by: params.actorId ?? null,
      })
    }
  }
  catch (error) {
    if (params.action === 'reserve' && applied.length > 0) {
      for (const item of applied) {
        const { data: stockRows } = await supabase
          .from('stock')
          .select('id, quantity')
          .eq('variant_id', item.variantId)
          .is('branch_id', null)
        const rows = stockRows ?? []
        if (!rows.length) continue
        const rollbackQty = rows.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0) + item.quantity
        await supabase.from('stock').update({ quantity: rollbackQty }).eq('id', rows[0].id)
        const duplicateIds = rows.slice(1).map((row: any) => row.id)
        if (duplicateIds.length)
          await supabase.from('stock').delete().in('id', duplicateIds)
      }
    }
    throw error
  }
}
