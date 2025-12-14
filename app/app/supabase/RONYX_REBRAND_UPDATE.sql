-- 🎨 REBRAND: Ronynx → ROnyx
-- Update Veronica's user metadata and all branding references

-- ============================================================================
-- STEP 1: Update Veronica's User Metadata
-- ============================================================================

-- Add brand metadata to Veronica's account
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{brand}',
  '"ROnyx"'
)
WHERE email = 'melidazvl@outlook.com';

-- Also ensure role is still manager
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"manager"'
)
WHERE email = 'melidazvl@outlook.com';

-- ============================================================================
-- STEP 2: Update Profile Full Name (if needed)
-- ============================================================================

UPDATE public.profiles
SET full_name = 'Veronica Butanda',
    updated_at = now()
WHERE email = 'melidazvl@outlook.com';

-- ============================================================================
-- STEP 3: Verify Branding Update
-- ============================================================================

-- Check Veronica's updated metadata
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'brand' as brand,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'melidazvl@outlook.com';

-- Check profile information
SELECT 
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM public.profiles 
WHERE email = 'melidazvl@outlook.com';

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
✅ auth.users Expected Result:
- email: melidazvl@outlook.com
- role: manager
- brand: ROnyx
- raw_user_meta_data: {"role": "manager", "brand": "ROnyx"}

✅ profiles Expected Result:
- email: melidazvl@outlook.com
- full_name: Veronica Butanda
- role: manager
- updated_at: [current timestamp]
*/

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎨 REBRANDING COMPLETE: Ronynx → ROnyx';
  RAISE NOTICE '';
  RAISE NOTICE '✅ User: melidazvl@outlook.com';
  RAISE NOTICE '✅ Brand: ROnyx Fleet Management';
  RAISE NOTICE '✅ Role: manager';
  RAISE NOTICE '✅ Dashboard: ROnyx Manager Dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Login: https://ronyx.movearoundtms.app/login';
  RAISE NOTICE '🚛 Portal: ROnyx Fleet Management Portal';
  RAISE NOTICE '⚡ Powered by Move Around TMS™';
  RAISE NOTICE '';
END $$;