# user-created-notify

Edge function that receives an internal trigger payload when a new auth user is created.

## Security

- Endpoint is deployed with `--no-verify-jwt`
- Request must include `Authorization: Bearer <INTERNAL_EDGE_TRIGGER_TOKEN>`

## Payload

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-03-21T10:00:00.000Z"
}
```

## Behavior

1. Reads `app_settings` SMTP fields.
2. Decrypts SMTP secret from `smtp_password_iv` and `smtp_password_content` with `CRYPTO_KEY`.
3. Finds active `superadmin` and `admin` emails.
4. Sends notification email using SMTP transport.
5. Writes structured logs with request id and recipient count.

## Operational Note

- Plain-text SMTP password fallback is intentionally disabled.
- Re-save SMTP password from Superadmin settings whenever `CRYPTO_KEY` changes.
