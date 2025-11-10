-- 🛠️ VERONICA AUTH QUICK FIX SCRIPT
-- Run this ONLY if the verification script shows issues

-- ============================================================================
-- FIX 1: Create user account if missing
-- ============================================================================

-- Check if user exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'melidazvl@outlook.com') THEN
    -- Create user account
    INSERT INTO auth.users (
      id, 
      email, 
      encrypted_password, 
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'melidazvl@outlook.com',
      crypt('RonynxTest123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"manager"}',
      now(),
      now()
    );
    RAISE NOTICE '✅ Created user account for melidazvl@outlook.com';
  ELSE
    RAISE NOTICE '✅ User account already exists';
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Update user metadata to include manager role
-- ============================================================================

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}', '"manager"'
)
WHERE email = 'melidazvl@outlook.com'
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'manager');

-- ============================================================================
-- FIX 3: Ensure email is confirmed
-- ============================================================================

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'melidazvl@outlook.com'
  AND email_confirmed_at IS NULL;

-- ============================================================================
-- FIX 4: Create or update profile record
-- ============================================================================

INSERT INTO public.profiles (
  id,
  full_name,
  role,
  email,
  created_at,
  updated_at
) 
SELECT 
  u.id,
  'Veronica Butanda',
  'manager',
  'melidazvl@outlook.com',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'melidazvl@outlook.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'manager',
  full_name = 'Veronica Butanda',
  email = 'melidazvl@outlook.com',
  updated_at = now();

-- ============================================================================
-- FIX 5: Link owner-operators to Veronica's profile
-- ============================================================================

-- Update existing owner-operators to link to Veronica
UPDATE public.owner_operators 
SET partner_id = (
  SELECT p.id FROM public.profiles p 
  WHERE p.email = 'melidazvl@outlook.com'
)
WHERE partner_id IS NULL;

-- ============================================================================
-- VERIFICATION: Run this to confirm all fixes worked
-- ============================================================================

-- Final verification query
SELECT 
  '🎯 User Account' as check_type,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN u.raw_user_meta_data->>'role' = 'manager' THEN '✅ Manager Role'
    ELSE '❌ Wrong/Missing Role: ' || COALESCE(u.raw_user_meta_data->>'role', 'NULL')
  END as role_check,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email Not Confirmed'
  END as email_check
FROM auth.users u
WHERE u.email = 'melidazvl@outlook.com'

UNION ALL

SELECT 
  '👤 Profile Record' as check_type,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN p.role = 'manager' THEN '✅ Manager Profile'
    ELSE '❌ Wrong Role: ' || COALESCE(p.role, 'NULL')
  END as role_check,
  CASE 
    WHEN p.full_name = 'Veronica Butanda' THEN '✅ Correct Name'
    ELSE '⚠️ Name: ' || COALESCE(p.full_name, 'NULL')
  END as email_check
FROM public.profiles p
WHERE p.email = 'melidazvl@outlook.com'

UNION ALL

SELECT 
  '🚛 Owner Operators' as check_type,
  '✅ COUNT: ' || COUNT(*)::text as status,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Data Linked'
    ELSE '❌ No Data'
  END as role_check,
  CASE 
    WHEN COUNT(*) = 8 THEN '✅ All Sample Records'
    ELSE '⚠️ Expected 8, Got ' || COUNT(*)::text
  END as email_check
FROM public.owner_operators oo
WHERE oo.partner_id IN (
  SELECT p.id FROM public.profiles p 
  WHERE p.email = 'melidazvl@outlook.com'
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 VERONICA AUTH SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Account: melidazvl@outlook.com';
  RAISE NOTICE '✅ Password: RonynxTest123!';
  RAISE NOTICE '✅ Role: manager';
  RAISE NOTICE '✅ Dashboard: /veronica';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Login URL: https://ronyx.movearoundtms.app/login';
  RAISE NOTICE '';
END $$;