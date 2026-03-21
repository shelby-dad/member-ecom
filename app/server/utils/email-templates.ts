export type EmailTemplateKey = 'user_add_notification'

export interface EmailTemplateVariableDef {
  key: string
  label: string
  placeholder: string
}

const VARIABLE_DEFS: Record<EmailTemplateKey, EmailTemplateVariableDef[]> = {
  user_add_notification: [
    { key: 'site_name', label: 'Site Name', placeholder: '{{site_name}}' },
    { key: 'user_full_name', label: 'User Full Name', placeholder: '{{user_full_name}}' },
    { key: 'user_email', label: 'User Email', placeholder: '{{user_email}}' },
    { key: 'user_phone', label: 'User Phone', placeholder: '{{user_phone}}' },
    { key: 'joined_at', label: 'Joined At', placeholder: '{{joined_at}}' },
    { key: 'dashboard_url', label: 'Dashboard URL', placeholder: '{{dashboard_url}}' },
  ],
}

export function isSupportedEmailTemplateKey(value: string): value is EmailTemplateKey {
  return value === 'user_add_notification'
}

export function getEmailTemplateVariables(templateKey: EmailTemplateKey): EmailTemplateVariableDef[] {
  return VARIABLE_DEFS[templateKey]
}

export function renderEmailTemplateTokens(input: string, variables: Record<string, string>) {
  return String(input ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const next = variables[key]
    return next === undefined || next === null ? '' : String(next)
  })
}
