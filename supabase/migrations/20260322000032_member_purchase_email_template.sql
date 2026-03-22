ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS send_to_user boolean NOT NULL DEFAULT false;

INSERT INTO email_templates (
  template_key,
  name,
  subject,
  body_html,
  variables,
  is_active,
  send_to_user,
  is_system
)
VALUES (
  'member_purchase',
  'Member Purchase',
  '[{{site_name}}] Member ordered {{order_number}}',
  '<h2 style="margin:0 0 12px;">Member Purchase Notification</h2><p style="margin:0 0 12px;">A member placed a bank transfer order.</p><p style="margin:0 0 12px;"><strong>Order:</strong> {{order_number}}<br><strong>Order Date:</strong> {{order_date}}<br><strong>Member:</strong> {{user_full_name}}<br><strong>Email:</strong> {{user_email}}<br><strong>Phone:</strong> {{user_phone}}<br><strong>Payment Method:</strong> {{payment_method}}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;margin:0 0 12px;"><thead><tr><th align="left" style="border:1px solid #e2e8f0;padding:8px;">Item</th><th align="left" style="border:1px solid #e2e8f0;padding:8px;">Qty</th><th align="left" style="border:1px solid #e2e8f0;padding:8px;">Line Total</th></tr></thead><tbody>{{#line_items}}<tr><td style="border:1px solid #e2e8f0;padding:8px;">{{line_of_item_name}}</td><td style="border:1px solid #e2e8f0;padding:8px;">{{line_of_item_qty}}</td><td style="border:1px solid #e2e8f0;padding:8px;">{{line_of_total}}</td></tr>{{/line_items}}</tbody></table><p style="margin:0 0 12px;"><strong>Discount:</strong> {{discount_amount}}<br><strong>Total:</strong> {{total_amount}}</p><p style="margin:0;"><strong>Note:</strong> {{note_information}}</p>',
  ARRAY[
    'site_name',
    'user_full_name',
    'user_email',
    'user_phone',
    'order_number',
    'order_date',
    'payment_method',
    'discount_amount',
    'total_amount',
    'note_information',
    'line_of_item_name',
    'line_of_item_qty',
    'line_of_total'
  ],
  true,
  false,
  true
)
ON CONFLICT (template_key) DO NOTHING;
