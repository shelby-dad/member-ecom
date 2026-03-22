UPDATE email_templates
SET
  name = 'Member Order',
  body_html = replace(body_html, 'Member Purchase Notification', 'Member Order Notification'),
  updated_at = now()
WHERE template_key = 'member_purchase';

ALTER TABLE email_templates
  DROP COLUMN IF EXISTS send_to_user;
