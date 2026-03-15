import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncProductCategories(supabase: SupabaseClient, productId: string, categoryIds: string[]) {
  await supabase.from('product_categories').delete().eq('product_id', productId)
  if (!categoryIds.length) return
  const payload = [...new Set(categoryIds)].map(category_id => ({ product_id: productId, category_id }))
  const { error } = await supabase.from('product_categories').insert(payload)
  if (error) throw error
}

export async function syncProductTags(supabase: SupabaseClient, productId: string, tagIds: string[]) {
  await supabase.from('product_tags').delete().eq('product_id', productId)
  if (!tagIds.length) return
  const payload = [...new Set(tagIds)].map(tag_id => ({ product_id: productId, tag_id }))
  const { error } = await supabase.from('product_tags').insert(payload)
  if (error) throw error
}

