#!/usr/bin/env bash
# Fails if a NEW duplicate migration numeric prefix is introduced.
# Existing historical duplicates are frozen (allowlist) — see SECURITY.md / the
# migration audit. Repo-only check; no database needed.
set -euo pipefail

MIG_DIR="${1:-db/migrations}"
[[ -d "$MIG_DIR" ]] || { echo "Migration dir not found: $MIG_DIR"; exit 1; }

# Frozen historical duplicate prefixes (immutable 001..220 history).
# Do NOT extend this list — new migrations must use unique prefixes (221+).
known="031 032 033 034 038 069 106 167 201 202 203"

dupes=$(
  find "$MIG_DIR" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' \
    | sed -nE 's/^([0-9]+)_.*/\1/p' \
    | sort | uniq -d
)

new_dupes=$(comm -23 \
  <(printf '%s\n' $dupes | sort -u) \
  <(printf '%s\n' $known | sort -u))

if [[ -n "${new_dupes//[[:space:]]/}" ]]; then
  echo "❌ NEW duplicate migration numeric prefixes found:"
  while read -r n; do
    [[ -z "$n" ]] && continue
    echo "  - $n:"
    find "$MIG_DIR" -maxdepth 1 -type f -name "${n}_*.sql" -printf '      %f\n' | sort
  done <<< "$new_dupes"
  echo "Fix: renumber the new file to a unique prefix (>= 221)."
  exit 1
fi

echo "✅ No new duplicate migration prefixes."
