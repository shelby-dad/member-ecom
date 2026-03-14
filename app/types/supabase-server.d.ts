import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

declare module '#supabase/server' {
  export function serverSupabaseClient(event: H3Event): Promise<SupabaseClient>
  export function serverSupabaseServiceRole(event: H3Event): SupabaseClient
  export function serverSupabaseUser(event: H3Event): Promise<{ id: string } | null>
  export function serverSupabaseSession(event: H3Event): Promise<unknown>
}
