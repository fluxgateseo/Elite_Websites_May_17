#!/usr/bin/env bash
set -e
source ~/.elite/secrets.env

echo "→ Plan A FINAL smoke test (10 checks)"
FAIL=0
check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "✓ $1"
  else
    echo "✗ $1"
    FAIL=$((FAIL+1))
  fi
}

check "D1 'elite-pipeline' has 4 tables" \
  "[ \"\$(wrangler d1 execute elite-pipeline --remote --command \"SELECT count(*) c FROM sqlite_master WHERE type='table' AND name LIKE 'elite_%';\" --json | jq -r '.[0].results[0].c')\" = '4' ]"

check "R2 bucket 'elite-pipeline-assets' exists" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/r2/buckets' | jq -e '.result.buckets[] | select(.name == \"elite-pipeline-assets\")'"

check "KV namespace 'elite-allowed-origins' exists" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/storage/kv/namespaces' | jq -e '.result[] | select(.title == \"elite-allowed-origins\")'"

check "elite-pipeline-dashboard worker deployed" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/workers/scripts' | jq -e '.result[] | select(.id == \"elite-pipeline-dashboard\")'"

check "elite-leads-worker deployed" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/workers/scripts' | jq -e '.result[] | select(.id == \"elite-leads-worker\")'"

check "elite-pipeline-workflow deployed" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/workers/scripts' | jq -e '.result[] | select(.id == \"elite-pipeline-workflow\")'"

check "Custom domain pipeline.chefconnect.it attached to dashboard" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/workers/domains' | jq -e '.result[] | select(.hostname == \"pipeline.chefconnect.it\" and .service == \"elite-pipeline-dashboard\")'"

check "Cloudflare Access PROTECTING dashboard (302 to *.cloudflareaccess.com)" \
  "curl -sI https://pipeline.chefconnect.it/sites | grep -iE '^location:.*cloudflareaccess'"

check "Access app + policy created (allow Brianzadigitale@gmail.com)" \
  "curl -fsS -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" 'https://api.cloudflare.com/client/v4/accounts/'\$CLOUDFLARE_ACCOUNT_ID'/access/apps' | jq -e '.result[] | select(.domain == \"pipeline.chefconnect.it\")'"

check "elite-astro-template builds locally" \
  "cd ~/Code/elite-websites/elite-astro-template && pnpm run build"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ $FAIL/10 checks failed."
  exit 1
fi
echo ""
echo "✅ ALL 10/10 Plan A foundation checks passed."
