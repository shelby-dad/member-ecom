import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getAppSettings } from '~/server/utils/app-settings'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const settings = await getAppSettings(event)
  return {
    ...settings,
    smtp_password: '',
    smtp_password_set: !!settings.smtp_password,
  }
})
