INSERT INTO email_templates (
  template_key,
  name,
  subject,
  body_html,
  variables,
  is_active,
  is_system
)
VALUES (
  'welcome_member_notification',
  'Welcome Member Notification',
  '[{{site_name}}] Welcome, {{user_full_name}}',
  '<h2 style="margin:0 0 12px;">Welcome to {{site_name}}</h2><p style="margin:0 0 12px;">Hi {{user_full_name}}, your member account is now active.</p><p style="margin:0 0 12px;"><strong>Email:</strong> {{user_email}}<br><strong>Phone:</strong> {{user_phone}}<br><strong>Joined At:</strong> {{joined_at}}</p><p style="margin:0;">If you need help, contact our shop team anytime.</p>',
  ARRAY['site_name', 'user_full_name', 'user_phone', 'user_email', 'dashboard_url', 'joined_at'],
  true,
  true
)
ON CONFLICT (template_key) DO NOTHING;
