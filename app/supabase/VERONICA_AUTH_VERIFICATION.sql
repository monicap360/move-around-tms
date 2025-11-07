-- 🔍 VERONICA AUTH VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify account setup

-- ============================================================================
-- STEP 1: Check if Veronica's user account exists
-- ============================================================================

SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as email_status,
  CASE 
    WHEN u.raw_user_meta_data->>'role' = 'manager' THEN '✅ Manager Role Set'
    WHEN u.raw_user_meta_data->>'role' IS NOT NULL THEN '⚠️ Role: ' || (u.raw_user_meta_data->>'role')
    ELSE '❌ No Role Set'
  END as role_status
FROM auth.users u
WHERE u.email = 'melidazvl@outlook.com';

-- ============================================================================
-- STEP 2: Check if profile exists in profiles table
-- ============================================================================

SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.created_at,
  CASE 
    WHEN p.role = 'manager' THEN '✅ Manager Profile'
    WHEN p.role IS NOT NULL THEN '⚠️ Profile Role: ' || p.role
    ELSE '❌ No Profile Role'
  END as profile_status
FROM public.profiles p
WHERE p.email = 'melidazvl@outlook.com'
   OR p.id IN (SELECT id FROM auth.users WHERE email = 'melidazvl@outlook.com');

-- ============================================================================
-- STEP 3: Check owner-operators data linkage
-- ============================================================================

SELECT 
  oo.id,
  oo.company_name,
  oo.contact_name,
  oo.monthly_fee,
  oo.payment_status,
  oo.partner_id,
  CASE 
    WHEN oo.partner_id IS NOT NULL THEN '✅ Linked to Partner'
    ELSE '⚠️ No Partner Link'
  END as linkage_status
FROM public.owner_operators oo
WHERE oo.partner_id IN (
  SELECT p.id FROM public.profiles p 
  WHERE p.email = 'melidazvl@outlook.com'
);

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================

/*
✅ STEP 1 Expected Result:
- id: Should show a UUID
- email: melidazvl@outlook.com
- raw_user_meta_data: {"role": "manager"}
- email_confirmed_at: Should have a timestamp (not null)
- email_status: "✅ Confirmed"
- role_status: "✅ Manager Role Set"

✅ STEP 2 Expected Result:
- id: Same UUID as step 1
- full_name: "Veronica Butanda"
- email: melidazvl@outlook.com
- role: manager
- profile_status: "✅ Manager Profile"

✅ STEP 3 Expected Result:
- Should show 8 owner-operator records
- All should have partner_id matching Veronica's profile ID
- linkage_status: "✅ Linked to Partner"
*/