import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getEmailTemplateVariables, isSupportedEmailTemplateKey } from '~/server/utils/email-templates'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('email_templates')
    .select('template_key, name, subject, body_html, variables, is_active, is_system, updated_at')
    .order('name', { ascending: true })

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return {
    items: (data ?? []).map((item: any) => {
      const key = String(item.template_key ?? '')
      const variableDefs = isSupportedEmailTemplateKey(key)
        ? getEmailTemplateVariables(key)
        : (Array.isArray(item.variables) ? item.variables : [])
            .map((v: unknown) => String(v ?? '').trim())
            .filter(Boolean)
            .map((v: string) => ({ key: v, label: v, placeholder: `{{${v}}}` }))

      return {
        template_key: key,
        name: String(item.name ?? ''),
        subject: String(item.subject ?? ''),
        body_html: String(item.body_html ?? ''),
        variables: variableDefs,
        is_active: Boolean(item.is_active),
        is_system: Boolean(item.is_system),
        updated_at: item.updated_at ?? null,
      }
    }),
  }
})
