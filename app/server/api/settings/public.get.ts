import { getAppSettings } from '~/server/utils/app-settings'

export default defineEventHandler(async (event) => {
  const settings = await getAppSettings(event)
  return {
    pricing_sign: settings.pricing_sign,
    pricing_symbol: settings.pricing_symbol,
    pricing_label: settings.pricing_label,
    pricing_decimals: settings.pricing_decimals,
    pricing_symbol_position: settings.pricing_symbol_position,
    shop_address: settings.shop_address,
    shop_email: settings.shop_email,
    shop_location: settings.shop_location,
    barcode_type: settings.barcode_type,
  }
})
