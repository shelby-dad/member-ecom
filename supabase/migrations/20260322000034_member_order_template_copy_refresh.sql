UPDATE email_templates
SET
  body_html = replace(
    body_html,
    'A member placed a bank transfer order.',
    'A member placed a new order.'
  ),
  updated_at = now()
WHERE template_key = 'member_purchase';
