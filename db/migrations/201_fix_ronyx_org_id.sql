-- Migration 201: Fix Ronyx org ID mismatch left by migration 165.
--
-- Migration 165 inserted/updated the RONYX org row to use a synthetic
-- placeholder UUID (00000000-0000-0000-0000-000000000001). The actual
-- ronyx_owner_operators rows, however, were written with the real org
-- ID 871e2c51-205c-4c1a-93dc-022a237f05ad. This migration restores the
-- organizations row to the real ID so all lookups agree.
--
-- Safe to run multiple times (ON CONFLICT DO NOTHING on duplicate real ID).

DO $$
DECLARE
  real_id  uuid := '871e2c51-205c-4c1a-93dc-022a237f05ad';
  fake_id  uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- If the placeholder row exists and the real row does NOT, rename the placeholder.
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = fake_id)
     AND NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = real_id)
  THEN
    UPDATE public.organizations SET id = real_id WHERE id = fake_id;
    RAISE NOTICE 'Renamed placeholder org ID → %', real_id;
  ELSE
    RAISE NOTICE 'No rename needed (real ID already present or placeholder gone).';
  END IF;

  -- Ensure the real org row has the correct code and status.
  UPDATE public.organizations
  SET organization_code = 'RONYX',
      status            = COALESCE(status, 'active')
  WHERE id = real_id;

  -- Backfill any OO rows still pointing at the placeholder.
  UPDATE public.ronyx_owner_operators
  SET organization_id = real_id
  WHERE organization_id = fake_id OR organization_id IS NULL;

  RAISE NOTICE 'Migration 201 complete. Ronyx org_id = %', real_id;
END $$;
