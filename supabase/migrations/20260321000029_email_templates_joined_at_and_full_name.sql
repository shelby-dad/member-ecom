UPDATE email_templates
SET
  subject = replace(subject, '{{user_created_at}}', '{{joined_at}}'),
  body_html = replace(
    replace(
      replace(
        body_html,
        '{{user_created_at}}',
        '{{joined_at}}'
      ),
      '{{user_id}}',
      '{{user_full_name}}'
    ),
    'Created At',
    'Joined At'
  ),
  variables = ARRAY['site_name', 'user_full_name', 'user_phone', 'user_email', 'dashboard_url', 'joined_at'],
  updated_at = now()
WHERE template_key = 'user_add_notification';
