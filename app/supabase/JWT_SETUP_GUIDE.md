# 🔧 SUPABASE JWT CUSTOM CLAIMS SETUP

## Overview

This guide ensures Veronica's `manager` role is properly accessible in JWT claims for any RLS policies that use `auth.jwt() ->> 'role'`.

---

## 🎯 Step 1: Configure JWT Custom Claims

### In Supabase Dashboard:

1. Go to **Authentication** → **Settings**
2. Scroll to **JWT Settings**
3. Find **Custom Claims** section
4. Add this configuration:

```json
{
  "role": "raw_user_meta_data->>role"
}
```

### What this does:

- Maps the `role` field from `raw_user_meta_data` to JWT claims
- Makes `auth.jwt() ->> 'role'` return the user's role
- Enables role-based RLS policies to work properly

---

## 🔍 Step 2: Test JWT Claims

Run this query in Supabase SQL Editor to test:

```sql
-- Test current user's JWT claims (run while logged in as Veronica)
SELECT
  auth.uid() as user_id,
  auth.jwt() ->> 'email' as jwt_email,
  auth.jwt() ->> 'role' as jwt_role,
  auth.jwt() -> 'raw_user_meta_data' ->> 'role' as meta_role;
```

### Expected Result:

```
user_id: [Veronica's UUID]
jwt_email: melidazvl@outlook.com
jwt_role: manager
meta_role: manager
```

---

## 🛡️ Step 3: Verify RLS Policies Compatibility

Our current setup uses **profile-based** RLS policies, which are more secure:

### ✅ Current Approach (Recommended):

```sql
-- Uses profiles table for role checking
CREATE POLICY "Partners can view their own owner operators" ON owner_operators
FOR SELECT USING (
  partner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'partner'
  )
);
```

### ⚠️ JWT-based Alternative (if needed):

```sql
-- Uses JWT claims for role checking
CREATE POLICY "Managers can view owner operators" ON owner_operators
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'manager'
  OR partner_id = auth.uid()
);
```

---

## 🔄 Step 4: Force Token Refresh

After configuring JWT claims, users need to refresh their tokens:

### Method 1: Sign Out/In

1. Veronica signs out completely
2. Signs back in with credentials
3. New JWT will include role claims

### Method 2: Programmatic Refresh

```javascript
// In your app (if needed)
const { error } = await supabase.auth.refreshSession();
```

---

## 🧪 Step 5: Testing Checklist

Test these scenarios after setup:

### ✅ Authentication Flow:

- [ ] Login with `melidazvl@outlook.com` / `RonynxTest123!`
- [ ] Auto-redirect to `/veronica` dashboard
- [ ] JWT contains `role: "manager"`

### ✅ Data Access:

- [ ] Can view owner-operators table
- [ ] Can see 8 sample records
- [ ] Cannot see other partners' data

### ✅ Role Permissions:

- [ ] Can access `/veronica` (detailed dashboard)
- [ ] Can access `/partners/ronyx` (visual portal)
- [ ] Can access `/veronica/change-password`

---

## 🚨 Troubleshooting

### Issue: "No role in JWT claims"

**Solution**:

1. Verify JWT Custom Claims configuration
2. Force user to sign out and back in
3. Check `raw_user_meta_data` has `"role": "manager"`

### Issue: "Access denied to owner-operators"

**Solution**:

1. Verify profile exists with `role = 'manager'`
2. Check `owner_operators.partner_id` matches user ID
3. Run the QUICKFIX script to link data

### Issue: "Wrong dashboard redirect"

**Solution**:

1. Verify email is exactly `melidazvl@outlook.com`
2. Check role-auth.tsx has email-based routing
3. Clear browser cache and retry

---

## 📊 Current Architecture Summary

### 🎯 Authentication Strategy:

- **Email-based routing** for Veronica (`melidazvl@outlook.com` → `/veronica`)
- **Role-based permissions** using `manager` role (level 4)
- **Profile-based RLS** for secure data isolation

### 🛡️ Security Layers:

1. **Supabase Auth** - Login/password verification
2. **Profile Role** - Role stored in profiles table
3. **RLS Policies** - Data access control via partner_id
4. **Email Routing** - Custom dashboard assignment

### 🔗 Data Flow:

```
Login → Profile Check → Role Verification → Email Routing → Dashboard Access
```

---

## ✅ Production URLs

After successful setup:

- **Login**: `https://ronyx.movearoundtms.app/login`
- **Dashboard**: `https://ronyx.movearoundtms.app/veronica`
- **Portal**: `https://ronyx.movearoundtms.app/partners/ronyx`
- **Settings**: `https://ronyx.movearoundtms.app/veronica/change-password`

---

## 📞 Support Commands

### Quick Status Check:

```sql
-- Run in Supabase SQL Editor
SELECT 'Auth User' as type, email, raw_user_meta_data->'role' as role
FROM auth.users WHERE email = 'melidazvl@outlook.com'
UNION ALL
SELECT 'Profile' as type, email, role::text
FROM profiles WHERE email = 'melidazvl@outlook.com';
```

### Reset Password (if needed):

```sql
-- Update password in Supabase
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'melidazvl@outlook.com';
```
