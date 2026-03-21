UPDATE email_templates
SET variables = (
  SELECT ARRAY(
    SELECT DISTINCT v
    FROM unnest(coalesce(variables, '{}'::text[]) || ARRAY['user_phone']) AS t(v)
  )
),
updated_at = now()
WHERE template_key = 'user_add_notification';
