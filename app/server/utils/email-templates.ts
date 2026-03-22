export type EmailTemplateKey = 'user_add_notification' | 'welcome_member_notification' | 'member_purchase'

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
  welcome_member_notification: [
    { key: 'site_name', label: 'Site Name', placeholder: '{{site_name}}' },
    { key: 'user_full_name', label: 'User Full Name', placeholder: '{{user_full_name}}' },
    { key: 'user_email', label: 'User Email', placeholder: '{{user_email}}' },
    { key: 'user_phone', label: 'User Phone', placeholder: '{{user_phone}}' },
    { key: 'joined_at', label: 'Joined At', placeholder: '{{joined_at}}' },
    { key: 'dashboard_url', label: 'Dashboard URL', placeholder: '{{dashboard_url}}' },
  ],
  member_purchase: [
    { key: 'site_name', label: 'Site Name', placeholder: '{{site_name}}' },
    { key: 'user_full_name', label: 'Member Full Name', placeholder: '{{user_full_name}}' },
    { key: 'user_email', label: 'Member Email', placeholder: '{{user_email}}' },
    { key: 'user_phone', label: 'Member Phone', placeholder: '{{user_phone}}' },
    { key: 'order_number', label: 'Order Number', placeholder: '{{order_number}}' },
    { key: 'order_date', label: 'Order Date', placeholder: '{{order_date}}' },
    { key: 'payment_method', label: 'Payment Method', placeholder: '{{payment_method}}' },
    { key: 'discount_amount', label: 'Discount Amount', placeholder: '{{discount_amount}}' },
    { key: 'total_amount', label: 'Total Amount', placeholder: '{{total_amount}}' },
    { key: 'note_information', label: 'Note Information', placeholder: '{{note_information}}' },
    { key: 'line_items_start', label: 'Line Items Loop Start', placeholder: '{{#line_items}}' },
    { key: 'line_of_item_name', label: 'Line Item Name', placeholder: '{{line_of_item_name}}' },
    { key: 'line_of_item_qty', label: 'Line Item Qty', placeholder: '{{line_of_item_qty}}' },
    { key: 'line_of_total', label: 'Line Item Total', placeholder: '{{line_of_total}}' },
    { key: 'line_items_end', label: 'Line Items Loop End', placeholder: '{{/line_items}}' },
  ],
}

export function isSupportedEmailTemplateKey(value: string): value is EmailTemplateKey {
  return value === 'user_add_notification' || value === 'welcome_member_notification' || value === 'member_purchase'
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

export function renderEmailTemplateWithLineItems(
  input: string,
  variables: Record<string, string>,
  lineItems: Array<Record<string, string>>,
) {
  const source = String(input ?? '')
  const looped = source.replace(/\{\{\s*#line_items\s*\}\}([\s\S]*?)\{\{\s*\/line_items\s*\}\}/g, (_match, block: string) => {
    if (!Array.isArray(lineItems) || !lineItems.length)
      return ''
    return lineItems.map(item => renderEmailTemplateTokens(block, { ...variables, ...item })).join('')
  })
  return renderEmailTemplateTokens(looped, variables)
}
