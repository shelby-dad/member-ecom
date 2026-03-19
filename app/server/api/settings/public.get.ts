import { getAppSettings } from '~/server/utils/app-settings'

export default defineEventHandler(async (event) => {
  const settings = await getAppSettings(event)
  return {
    site_name: settings.site_name,
    site_favicon_original: settings.site_favicon_original,
    site_favicon_64: settings.site_favicon_64,
    site_favicon_84: settings.site_favicon_84,
    site_favicon_512: settings.site_favicon_512,
    pricing_sign: settings.pricing_sign,
    pricing_symbol: settings.pricing_symbol,
    pricing_label: settings.pricing_label,
    pricing_decimals: settings.pricing_decimals,
    pricing_symbol_position: settings.pricing_symbol_position,
    shop_logo: settings.shop_logo,
    shop_name: settings.shop_name,
    shop_address: settings.shop_address,
    shop_email: settings.shop_email,
    mobile_number: settings.mobile_number,
    barcode_type: settings.barcode_type,
  }
})
