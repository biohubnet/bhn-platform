#!/usr/bin/env bash
# Push SMTP_* env vars to all Vercel environments and redeploy.
#
# Usage:
#   SMTP_HOST=smtp.resend.com \
#   SMTP_PORT=465 \
#   SMTP_USER=resend \
#   SMTP_PASS=re_xxxxxxxxxxxx \
#   SMTP_FROM='BHN Training <onboarding@resend.dev>' \
#   ./scripts/setup-smtp-env.sh
#
# Or stash values in a gitignored file you source first:
#   source .env.smtp.local && ./scripts/setup-smtp-env.sh
#
# Requires: vercel CLI logged in and the project linked (.vercel/ exists).

set -euo pipefail

VARS=(SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM)
ENVS=(production preview development)

# Sanity check — abort if any required var is unset or empty.
missing=()
for v in "${VARS[@]}"; do
  [[ -z "${!v:-}" ]] && missing+=("$v")
done
if (( ${#missing[@]} > 0 )); then
  echo "Missing required env vars: ${missing[*]}" >&2
  echo "See the header of this script for usage." >&2
  exit 1
fi

# Vercel CLI present?
if ! command -v vercel &>/dev/null; then
  echo "vercel CLI not found. Install with: npm i -g vercel" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# Push each var to each environment. `vercel env add` prompts when run
# interactively, but reads stdin when piped. We remove first to avoid
# the "already exists" prompt — failures are silenced because rm errors
# when the var doesn't exist yet, which is fine.
for env in "${ENVS[@]}"; do
  for v in "${VARS[@]}"; do
    echo "→ ${env}: ${v}"
    vercel env rm "$v" "$env" --yes &>/dev/null || true
    printf '%s' "${!v}" | vercel env add "$v" "$env" >/dev/null
  done
done

echo
echo "All SMTP_* vars set across production / preview / development."
echo "Triggering a Production redeploy so the new vars take effect..."
vercel --prod --yes
