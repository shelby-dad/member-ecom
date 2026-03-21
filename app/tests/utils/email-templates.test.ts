import { describe, expect, it } from 'vitest'
import { getEmailTemplateVariables, isSupportedEmailTemplateKey, renderEmailTemplateTokens } from '~/server/utils/email-templates'

describe('email template utilities', () => {
  it('validates supported template key', () => {
    expect(isSupportedEmailTemplateKey('user_add_notification')).toBe(true)
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
})
