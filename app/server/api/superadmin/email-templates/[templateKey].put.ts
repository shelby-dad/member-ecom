import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getEmailTemplateVariables, isSupportedEmailTemplateKey } from '~/server/utils/email-templates'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1),
  is_active: z.boolean(),
})

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const templateKey = String(getRouterParam(event, 'templateKey') ?? '').trim()
  if (!isSupportedEmailTemplateKey(templateKey))
    throw createError({ statusCode: 404, message: 'Template not found.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('email_templates')
    .update({
      subject: parsed.data.subject.trim(),
      body_html: parsed.data.body_html,
      is_active: parsed.data.is_active,
    })
    .eq('template_key', templateKey)
    .select('template_key, name, subject, body_html, variables, is_active, is_system, updated_at')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to update template.' })

  return {
    item: {
      template_key: String(data.template_key),
      name: String(data.name ?? ''),
      subject: String(data.subject ?? ''),
      body_html: String(data.body_html ?? ''),
      variables: getEmailTemplateVariables(templateKey),
      is_active: Boolean(data.is_active),
      is_system: Boolean(data.is_system),
      updated_at: data.updated_at ?? null,
    },
  }
})
