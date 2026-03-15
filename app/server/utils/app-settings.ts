import type { H3Event } from 'h3'
import { getServiceRoleClient } from '~/server/utils/supabase'

export type BarcodeType = 'code128' | 'ean13' | 'upca'

export interface AppSettingsRow {
  pricing_sign: string
  pricing_symbol: string
  pricing_label: string
  pricing_decimals: number
  pricing_symbol_position: 'before' | 'after'
  shop_address: string | null
  shop_email: string | null
  shop_location: string | null
  barcode_type: BarcodeType
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_secure: boolean
}

export const defaultAppSettings: AppSettingsRow = {
  pricing_sign: '',
  pricing_symbol: '฿',
  pricing_label: 'Price',
  pricing_decimals: 2,
  pricing_symbol_position: 'before',
  shop_address: null,
  shop_email: null,
  shop_location: null,
  barcode_type: 'code128',
  smtp_host: null,
  smtp_port: null,
  smtp_user: null,
  smtp_password: null,
  smtp_from_email: null,
  smtp_from_name: null,
  smtp_secure: false,
}

export async function getAppSettings(event: H3Event): Promise<AppSettingsRow> {
  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from('app_settings')
      .insert({ id: true })
      .select('*')
      .single()

    if (insertError || !inserted)
      throw createError({ statusCode: 500, message: insertError?.message ?? 'Failed to initialize app settings' })

    return { ...defaultAppSettings, ...inserted }
  }

  return { ...defaultAppSettings, ...data }
}
