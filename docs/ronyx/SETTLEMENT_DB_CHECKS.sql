-- Settlement DB Checks (MySQL)

-- Check tables exist
SHOW TABLES LIKE '%settlement%';

-- Check sample data
SELECT 
    d.first_name,
    r.rate_name,
    r.rate_value,
    r.rate_type,
    r.is_default
FROM drivers d
LEFT JOIN driver_pay_rates r ON d.id = r.driver_id
WHERE d.status = 'ACTIVE'
LIMIT 10;

-- Check rate priority logic
EXPLAIN SELECT * FROM driver_pay_rates 
WHERE driver_id = 245 
AND effective_date <= CURDATE()
ORDER BY 
    CASE 
        WHEN material_type IS NOT NULL AND customer_id IS NOT NULL THEN 1
        WHEN customer_id IS NOT NULL THEN 2
        WHEN material_type IS NOT NULL THEN 3
        WHEN equipment_type IS NOT NULL THEN 4
        WHEN is_default = TRUE THEN 5
        ELSE 6
    END;
