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

require_non_empty_value() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Missing required value: ${key} in ${ENV_FILE}"
    exit 1
  fi
}

extract_ref_from_url() {
  local url="$1"
  local host
  host="$(echo "$url" | sed -E 's#^https?://##' | cut -d/ -f1)"
  echo "$host" | sed -E 's#\.supabase\.co$##'
}

read_linked_project_ref() {
  local linked_file="../supabase/.temp/project-ref"
  if [[ -f "$linked_file" ]]; then
    tr -d '\r\n' < "$linked_file"
    return 0
  fi
  echo ""
}

PROJECT_REF="${PROJECT_ID:-}"
if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(read_env_value PROJECT_ID)"
fi
if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(read_env_value SUPABASE_PROJECT_REF)"
fi
if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(read_linked_project_ref)"
fi
require_non_empty_value "PROJECT_ID" "$PROJECT_REF"

CRYPTO_KEY_VALUE="$(read_env_value CRYPTO_KEY)"
INTERNAL_EDGE_TRIGGER_TOKEN_VALUE="$(read_env_value INTERNAL_EDGE_TRIGGER_TOKEN)"
require_non_empty_value "CRYPTO_KEY" "$CRYPTO_KEY_VALUE"
require_non_empty_value "INTERNAL_EDGE_TRIGGER_TOKEN" "$INTERNAL_EDGE_TRIGGER_TOKEN_VALUE"

node ./scripts/sync-to-supabase.mjs

echo "[deploy] target project: $PROJECT_REF"
echo "[deploy] setting/updating secrets from $ENV_FILE"
while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  line="${raw_line%$'\r'}"
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" != *"="* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  key="$(echo "$key" | xargs)"
  if [[ -z "$key" ]]; then
    continue
  fi
  if [[ "$key" == "PROJECT_ID" || "$key" == "SUPABASE_PROJECT_REF" ]]; then
    continue
  fi
  if [[ "$key" == SUPABASE_* ]]; then
    continue
  fi
  echo "[deploy] upserting secret: $key"
  npx supabase secrets unset "$key" --workdir .. --project-ref "$PROJECT_REF" --yes >/dev/null 2>&1 || true
  npx supabase secrets set --workdir .. --project-ref "$PROJECT_REF" "${key}=${value}"
done < "$ENV_FILE"

echo "[deploy] verifying managed secrets timestamps"
MANAGED_KEYS="$(awk -F= '
  /^[[:space:]]*#/ { next }
  /^[[:space:]]*$/ { next }
  index($0, "=") == 0 { next }
  {
    key=$1
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
    if (key == "PROJECT_ID" || key == "SUPABASE_PROJECT_REF") next
    if (key ~ /^SUPABASE_/) next
    print key
  }
' "$ENV_FILE")"
SECRETS_AFTER_JSON="$(npx supabase secrets list --workdir .. --project-ref "$PROJECT_REF" --output json)"
node -e '
const raw = process.argv[1] || "[]";
const keys = (process.argv[2] || "").split("\n").map(s => s.trim()).filter(Boolean);
let secrets = [];
try { secrets = JSON.parse(raw); } catch { secrets = []; }
const map = new Map(Array.isArray(secrets) ? secrets.map((s) => [String(s?.name || ""), s]) : []);
for (const key of keys) {
  const item = map.get(key);
  if (!item) {
    console.log(`[deploy][verify] ${key}: MISSING`);
    continue;
  }
  const updatedAt = item.updated_at || item.updatedAt || item.updated || "-";
  console.log(`[deploy][verify] ${key}: updated_at=${updatedAt}`);
}
' "$SECRETS_AFTER_JSON" "$MANAGED_KEYS"

echo "[deploy] deploying function $FUNCTION_NAME"
npx supabase functions deploy "$FUNCTION_NAME" --workdir .. --project-ref "$PROJECT_REF" --no-verify-jwt

echo "[deploy] done"
