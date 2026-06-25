#!/usr/bin/env bash
# Multi-tenant fail-fast guard, tuned for this repo (runtime roots: app/ lib/).
#
# REPORT_ONLY=true  -> prints remaining single-tenant fallbacks and EXITS 0
#                      (use during the RONYX_ORG_ID -> resolveOrgId migration).
# REPORT_ONLY=false -> FAILS the build on any forbidden fallback (flip this the
#                      moment the migration is complete; it then proves we stay
#                      multi-tenant-safe and blocks regressions).
set -uo pipefail

REPORT_ONLY="${REPORT_ONLY:-true}"
RUNTIME_PATHS="app lib"
echo "== Multi-tenant guard (REPORT_ONLY=$REPORT_ONLY) =="

# Files allowed to reference the env org during/after migration:
#  - resolveOrgId.ts: returns RONYX_ORG_ID ONLY in demo mode (flag off)
#  - requireOrgRole.ts: same demo-bypass logic
#  - storage-paths.ts: legacy @deprecated wrappers (removed at end of step 7)
ALLOW='lib/auth/resolveOrgId\.ts|auth/requireOrgRole\.ts|storage-paths\.ts'

fail=0

echo "-- forbidden env-org fallbacks in runtime code"
hits=$(grep -RInE 'RONYX_ORG_ID|DEFAULT_ORG' $RUNTIME_PATHS \
        --include='*.ts' --include='*.tsx' 2>/dev/null \
        | grep -vE "$ALLOW" || true)
if [[ -n "$hits" ]]; then
  echo "$hits"
  n=$(printf '%s\n' "$hits" | wc -l | tr -d ' ')
  echo "→ $n forbidden org-fallback reference(s) still in runtime code."
  fail=1
else
  echo "✓ none"
fi

echo "-- storage path builders must take an explicit orgId (no legacy in new code)"
legacy=$(grep -RInE '\b(fastScanPath|driverDocPath|equipmentPath|compliancePath|payrollPath|settlementPath|customerDocPath|projectDocPath|invoicePath|contractPath|auditPath|generalUploadPath)\(' $RUNTIME_PATHS \
          --include='*.ts' --include='*.tsx' 2>/dev/null \
          | grep -vE 'storage-paths\.ts' || true)
if [[ -n "$legacy" ]]; then
  echo "$legacy" | sed 's/^/  (legacy) /'
  echo "→ migrate these to tenantPath(orgId, …) / tenantDatedPath(orgId, …)."
  fail=1
else
  echo "✓ no legacy storage builders in callers"
fi

# Build is gated by the deploy pipeline separately; tsc is not a gate here
# because the project ships with typescript.ignoreBuildErrors=true.

if [[ "$fail" -eq 1 && "$REPORT_ONLY" != "true" ]]; then
  echo "❌ Multi-tenant guard FAILED."
  exit 1
fi
echo "✅ Multi-tenant guard ${REPORT_ONLY:+(report mode) }passed."
