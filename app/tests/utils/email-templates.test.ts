import { describe, expect, it } from 'vitest'
import {
  getEmailTemplateVariables,
  isSupportedEmailTemplateKey,
  renderEmailTemplateTokens,
  renderEmailTemplateWithLineItems,
} from '~/server/utils/email-templates'

describe('email template utilities', () => {
  it('validates supported template key', () => {
    expect(isSupportedEmailTemplateKey('user_add_notification')).toBe(true)
    expect(isSupportedEmailTemplateKey('member_purchase')).toBe(true)
    expect(isSupportedEmailTemplateKey('unknown')).toBe(false)
  })

  it('returns available variable placeholders', () => {
    const variables = getEmailTemplateVariables('user_add_notification')
    expect(variables.some(v => v.placeholder === '{{site_name}}')).toBe(true)
    expect(variables.some(v => v.placeholder === '{{user_email}}')).toBe(true)
    expect(variables.some(v => v.placeholder === '{{user_phone}}')).toBe(true)
    expect(variables.some(v => v.placeholder === '{{user_full_name}}')).toBe(true)
    expect(variables.some(v => v.placeholder === '{{joined_at}}')).toBe(true)
  })

  it('renders tokens and removes unknown variables', () => {
    const rendered = renderEmailTemplateTokens(
      'Hi {{ user_email }} from {{site_name}} {{missing}}',
      { user_email: 'member@test.com', site_name: 'Tenant Shop' },
    )
    expect(rendered).toBe('Hi member@test.com from Tenant Shop ')
  })

  it('renders line item loop block in member purchase template', () => {
    const rendered = renderEmailTemplateWithLineItems(
      '<table><tbody>{{#line_items}}<tr><td>{{line_of_item_name}}</td><td>{{line_of_item_qty}}</td><td>{{line_of_total}}</td></tr>{{/line_items}}</tbody></table>',
      {},
      [
        { line_of_item_name: 'A', line_of_item_qty: '1', line_of_total: '100 MMK' },
        { line_of_item_name: 'B', line_of_item_qty: '2', line_of_total: '200 MMK' },
      ],
    )
    expect(rendered).toContain('<td>A</td>')
    expect(rendered).toContain('<td>2</td>')
    expect(rendered).toContain('<td>200 MMK</td>')
  })
})
