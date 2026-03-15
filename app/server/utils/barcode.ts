import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BarcodeType } from '~/server/utils/app-settings'
import { getAppSettings } from '~/server/utils/app-settings'

type ClientLike = SupabaseClient<any, 'public', any>

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++)
    out += Math.floor(Math.random() * 10).toString()
  return out
}

function randomCode128(length = 12): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let out = ''
  for (let i = 0; i < length; i++)
    out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function ean13CheckDigit(base12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = Number(base12[i])
    sum += i % 2 === 0 ? digit : digit * 3
  }
  const check = (10 - (sum % 10)) % 10
  return String(check)
}

function upcaCheckDigit(base11: string): string {
  let odd = 0
  let even = 0
  for (let i = 0; i < 11; i++) {
    const digit = Number(base11[i])
    if (i % 2 === 0) odd += digit
    else even += digit
  }
  const total = odd * 3 + even
  const check = (10 - (total % 10)) % 10
  return String(check)
}

function generateByType(type: BarcodeType): string {
  if (type === 'ean13') {
    const base = randomDigits(12)
    return `${base}${ean13CheckDigit(base)}`
  }
  if (type === 'upca') {
    const base = randomDigits(11)
    return `${base}${upcaCheckDigit(base)}`
  }
  return randomCode128(12)
}

export async function generateUniqueProductBarcode(
  event: H3Event,
  supabase: ClientLike,
  explicitType?: BarcodeType,
): Promise<{ barcode: string; type: BarcodeType }> {
  const settings = await getAppSettings(event)
  const type = explicitType ?? settings.barcode_type ?? 'code128'

  for (let i = 0; i < 20; i++) {
    const barcode = generateByType(type)
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode)
      .limit(1)

    if (error)
      throw createError({ statusCode: 500, message: error.message })

    if (!data?.length)
      return { barcode, type }
  }

  throw createError({ statusCode: 500, message: 'Unable to generate unique barcode' })
}
