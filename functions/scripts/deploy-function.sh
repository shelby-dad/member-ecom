#!/usr/bin/env bash
set -euo pipefail

FUNCTION_NAME="${1:-user-created-notify}"
ENV_NAME="${2:-production}"
ENV_FILE=".env.${ENV_NAME}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

read_env_value() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | sed -E "s/^${key}=//" | tr -d '\r' || true)"
  echo "$value"
}

extract_ref_from_url() {
  local url="$1"
  local host
  host="$(echo "$url" | sed -E 's#^https?://##' | cut -d/ -f1)"
  echo "$host" | sed -E 's#\.supabase\.co$##'
}

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(read_env_value SUPABASE_PROJECT_REF)"
fi
if [[ -z "$PROJECT_REF" ]]; then
  URL_VALUE="$(read_env_value SUPABASE_URL)"
  if [[ -n "$URL_VALUE" ]]; then
    PROJECT_REF="$(extract_ref_from_url "$URL_VALUE")"
  fi
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "Missing project ref. Provide SUPABASE_PROJECT_REF in shell or env file, or set SUPABASE_URL."
  exit 1
fi

node ./scripts/sync-to-supabase.mjs

echo "[deploy] setting secrets from $ENV_FILE"
TMP_SECRETS_FILE="$(mktemp)"
trap 'rm -f "$TMP_SECRETS_FILE"' EXIT

# Supabase-managed vars are used for CLI auth/targeting and must not be sent as function secrets.
grep -E -v '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_PROJECT_REF)=' "$ENV_FILE" > "$TMP_SECRETS_FILE"

npx supabase secrets set --workdir .. --project-ref "$PROJECT_REF" --env-file "$TMP_SECRETS_FILE"

echo "[deploy] deploying function $FUNCTION_NAME"
npx supabase functions deploy "$FUNCTION_NAME" --workdir .. --project-ref "$PROJECT_REF" --no-verify-jwt

echo "[deploy] done"
