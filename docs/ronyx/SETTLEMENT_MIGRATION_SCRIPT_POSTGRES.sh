#!/bin/bash
# Run this from your project root directory (Postgres/Supabase)

echo "Starting Ronyx TMS Settlement System Migration (Postgres)..."
echo "==========================================================="

# Required env vars:
# PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

if [[ -z "${PGHOST}" || -z "${PGDATABASE}" || -z "${PGUSER}" || -z "${PGPASSWORD}" ]]; then
  echo "Missing required Postgres env vars (PGHOST, PGDATABASE, PGUSER, PGPASSWORD)."
  exit 1
fi

# 1. Backup existing data (SAFETY FIRST)
echo "Creating database backup..."
pg_dump --format=custom --file "backup_pre_settlement_$(date +%Y%m%d_%H%M%S).dump"

# 2. Run migrations (uses existing repo migrations)
echo "Running settlement migrations..."
psql -v ON_ERROR_STOP=1 -c "BEGIN;"
psql -v ON_ERROR_STOP=1 -f "app/db/migrations/046_driver_pay_rates.sql"
psql -v ON_ERROR_STOP=1 -f "app/db/migrations/047_driver_settlements.sql"
psql -v ON_ERROR_STOP=1 -f "app/db/migrations/048_settlement_disputes.sql"
psql -v ON_ERROR_STOP=1 -c "COMMIT;"

# 3. Verify tables were created
echo "Verifying table creation..."
psql -c "\dt driver_*"
psql -c "\dt settlement_*"

echo "==========================================================="
echo "Migration complete! Settlement system is ready for development."
