#!/usr/bin/env bash
# Create an idempotent www -> apex 301 Single Redirect Rule for sites
# whose www hostname returns Cloudflare 522 (www not bound to the Pages
# project). Apex stays canonical; www just 301s to it, path preserved.
#
# Why a script and not an MCP/dashboard action: the redirect lives at the
# zone level (http_request_dynamic_redirect ruleset). Run this where the
# account-scoped token exists (operator box / worker host), not from an
# ephemeral session.
#
# Usage:
#   source ~/.elite/secrets.env
#   CF_TOKEN="$CF_TOKEN_IT" ./scripts/fix-www-redirect.sh agilescienceapp.it modoristorante.it
#
# Requires: curl, jq, a token with Zone Read + Zone WAF/Config (Dynamic
# Redirect) edit on the target account. Safe to re-run: it updates the
# single managed rule in place instead of stacking duplicates.
set -euo pipefail

: "${CF_TOKEN:?set CF_TOKEN (e.g. CF_TOKEN=\$CF_TOKEN_IT)}"
API="https://api.cloudflare.com/client/v4"
RULE_DESC="www->apex 301 (managed by Elite_Websites_May_17/scripts/fix-www-redirect.sh)"

cf() { curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" "$@"; }

for DOMAIN in "$@"; do
  echo "== ${DOMAIN} =="
  ZONE_ID="$(cf "${API}/zones?name=${DOMAIN}&status=active" | jq -r '.result[0].id // empty')"
  if [ -z "${ZONE_ID}" ]; then
    echo "  ! no active zone for ${DOMAIN} on this token's account — skipping"
    continue
  fi

  # The single redirect phase entrypoint ruleset (created on first use).
  RS_ID="$(cf "${API}/zones/${ZONE_ID}/rulesets?phase=http_request_dynamic_redirect" \
            | jq -r '.result[0].id // empty')"
  if [ -z "${RS_ID}" ]; then
    RS_ID="$(cf -X PUT "${API}/zones/${ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
              --data '{"rules":[]}' | jq -r '.result.id')"
  fi

  RULE_JSON=$(jq -n --arg d "${DOMAIN}" --arg desc "${RULE_DESC}" '{
    description: $desc,
    expression: ("(http.host eq \"www." + $d + "\")"),
    action: "redirect",
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: ("concat(\"https://" + $d + "\", http.request.uri.path)") },
        preserve_query_string: true
      }
    }
  }')

  EXISTING="$(cf "${API}/zones/${ZONE_ID}/rulesets/${RS_ID}" \
               | jq -r --arg desc "${RULE_DESC}" '.result.rules[]? | select(.description==$desc) | .id' | head -1)"
  if [ -n "${EXISTING}" ]; then
    cf -X PATCH "${API}/zones/${ZONE_ID}/rulesets/${RS_ID}/rules/${EXISTING}" --data "${RULE_JSON}" >/dev/null
    echo "  updated existing rule ${EXISTING}"
  else
    cf -X POST "${API}/zones/${ZONE_ID}/rulesets/${RS_ID}/rules" --data "${RULE_JSON}" >/dev/null
    echo "  created rule"
  fi
  echo "  verify: curl -sI https://www.${DOMAIN}/  ->  expect 301 to https://${DOMAIN}/"
done
