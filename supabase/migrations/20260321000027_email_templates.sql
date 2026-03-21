CREATE TABLE IF NOT EXISTS email_templates (
  template_key text PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  'user_add_notification',
  'User Add Notification',
  '[{{site_name}}] New user joined',
  '<h2 style="margin:0 0 12px;">Welcome update</h2><p style="margin:0 0 12px;">A new user has joined {{site_name}}.</p><p style="margin:0 0 12px;"><strong>Name:</strong> {{user_full_name}}<br><strong>Email:</strong> {{user_email}}<br><strong>Phone:</strong> {{user_phone}}<br><strong>Joined At:</strong> {{joined_at}}</p><p style="margin:0;"><a href="{{dashboard_url}}" target="_blank" rel="noopener noreferrer">Open users dashboard</a></p>',
  ARRAY['site_name', 'user_full_name', 'user_phone', 'user_email', 'dashboard_url', 'joined_at'],
  true,
  true
)
ON CONFLICT (template_key) DO NOTHING;

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_superadmin_read ON email_templates;
CREATE POLICY email_templates_superadmin_read
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'superadmin'
        AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS email_templates_superadmin_update ON email_templates;
CREATE POLICY email_templates_superadmin_update
  ON email_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'superadmin'
        AND p.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'superadmin'
        AND p.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION prevent_email_template_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Default email templates cannot be deleted.';
END;
$$;

DROP TRIGGER IF EXISTS email_templates_prevent_delete ON email_templates;
CREATE TRIGGER email_templates_prevent_delete
  BEFORE DELETE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION prevent_email_template_delete();

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
