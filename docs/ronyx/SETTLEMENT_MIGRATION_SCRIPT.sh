#!/bin/bash
# Run this from your project root directory

echo "Starting Ronyx TMS Settlement System Migration..."
echo "=================================================="

# 1. Backup existing data (SAFETY FIRST)
echo "Creating database backup..."
mysqldump -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME:-ronyx_tms}" > backup_pre_settlement_$(date +%Y%m%d_%H%M%S).sql

# 2. Run the migration
echo "Running migration script..."
mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME:-ronyx_tms}" < 001_create_settlement_tables.sql

# 3. Verify tables were created
echo "Verifying table creation..."
mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME:-ronyx_tms}" -e "
SHOW TABLES LIKE 'driver%';
SHOW TABLES LIKE 'settlement%';
"

# 4. Create default rates for existing drivers
echo "Creating default pay rates for active drivers..."
mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME:-ronyx_tms}" -e "
-- Check how many drivers got default rates
SELECT COUNT(*) as 'Drivers with Default Rates' 
FROM driver_pay_rates 
WHERE is_default = TRUE;

-- Sample view of what was created
SELECT 
    d.id as driver_id,
    d.first_name,
    d.last_name,
    r.rate_name,
    r.rate_value,
    r.rate_type,
    r.effective_date
FROM drivers d
LEFT JOIN driver_pay_rates r ON d.id = r.driver_id AND r.is_default = TRUE
WHERE d.status = 'ACTIVE'
LIMIT 5;
"

echo "=================================================="
echo "Migration complete! Settlement system is ready for development."
echo "Next: Implement the PayRateService class."
