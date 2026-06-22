-- Migration 200: Backfill organization_id for ronyx_owner_operators rows that have NULL
-- Real Ronyx org ID confirmed from DB inventory: 871e2c51-205c-4c1a-93dc-022a237f05ad

UPDATE public.ronyx_owner_operators
SET organization_id = '871e2c51-205c-4c1a-93dc-022a237f05ad'
WHERE organization_id IS NULL;

-- Verify
SELECT organization_id, COUNT(*) as row_count
FROM public.ronyx_owner_operators
GROUP BY organization_id
ORDER BY row_count DESC;
