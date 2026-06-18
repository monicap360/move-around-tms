-- Migration 167: Pricing model update
-- Owner Operator Hub → free/included (do not charge per OO for basic tracking)
-- CCB → remains $199/mo enterprise add-on (volume pricing shown in UI only)

UPDATE public.modules
SET
  monthly_price     = 0,
  name              = 'Owner Operator Hub',
  description       = 'Manage owner operators, contracts, insurance, trucks, drivers, settlements, and documents. Includes COI tracking, job history, and settlement reports.',
  included_in_plans = ARRAY['operations', 'pro', 'enterprise', 'enterprise-plus']
WHERE slug = 'owner-operators';

-- Ensure CCB is correctly slotted as enterprise-only and well-described
UPDATE public.modules
SET
  name          = 'Carrier Clearance Bureau™',
  description   = 'Carrier vetting, clearance status, billing risk, compliance controls, dispatch holds, account blocks, and audit history for owner operators and sub-haulers. Base plan includes up to 10 owner operators. Additional owner operators: $10/month each.',
  included_in_plans = ARRAY['enterprise', 'enterprise-plus']
WHERE slug = 'ccb';
