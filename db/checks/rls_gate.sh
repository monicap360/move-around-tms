#!/usr/bin/env bash
# Fails if any RLS violation is found (public table with RLS off, or RLS-on table
# with no policy that isn't in the SECURITY.md allowlist). Requires DATABASE_URL.
# Read-only: only inspects pg_class / pg_policies catalogs.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL (GitHub Actions secret)}"

rows=$(psql "$DATABASE_URL" -tAf db/checks/rls_ci_gate.sql)

if [[ -n "${rows//[[:space:]]/}" ]]; then
  echo "❌ RLS gate failed — violations:"
  echo "$rows"
  echo "Fix: enable RLS / add a scoped policy, OR (if intentionally service-role-only)"
  echo "add the table to BOTH db/checks/rls_ci_gate.sql allowlist and SECURITY.md."
  exit 1
fi

echo "✅ RLS gate passed — no exposed or undocumented-locked tables."
