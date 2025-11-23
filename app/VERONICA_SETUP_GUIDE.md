# 🚀 VERONICA BUTANDA (ROnyx) - ACCOUNT SETUP GUIDE

## 👤 User Account Details

**Email**: `melidazvl@outlook.com`  
**Role**: `manager`  
**Temporary Password**: `RonynxTest123!`  
**Dashboard Access**: `/veronica` (auto-redirect)

---

## 💎 OPTION 1: Supabase Dashboard Setup (Recommended)

### Step 1: Create User Account
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **+ Add User**
3. Fill in the details:
   ```
   Email: melidazvl@outlook.com
   Password: RonynxTest123!
   ```
4. ✅ **Check**: Auto-confirm user
5. Click **Create User**

### Step 2: Set User Role in Profiles
1. Go to **Supabase Dashboard** → **Table Editor** → **profiles**
2. Find the user with email `melidazvl@outlook.com`
3. Set the **role** field to: `manager`
4. Set **full_name** to: `Veronica Butanda`
5. Save changes

---

## 🔧 OPTION 2: SQL Script Setup (Advanced)

Run this in your **Supabase SQL Editor**:

```sql
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
  '{}',
  now(),
  now()
);

-- Create profile with manager role
INSERT INTO public.profiles (
  id,
  full_name,
  role,
  email,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'melidazvl@outlook.com'),
  'Veronica Butanda',
  'manager',
  'melidazvl@outlook.com',
  now(),
  now()
);

-- Link owner-operators to Veronica's profile (optional)
UPDATE owner_operators 
SET partner_id = (SELECT id FROM profiles WHERE email = 'melidazvl@outlook.com')
WHERE partner_id IS NULL;
```

---

## 🎯 Access & Navigation Flow

### 1. **Login Process**
- Veronica goes to: `https://ronyx.movearoundtms.app/login`
- Enters credentials:
  ```
  Email: melidazvl@outlook.com
  Password: RonynxTest123!
  ```

### 2. **Automatic Redirection**
- System detects email: `melidazvl@outlook.com`
- Auto-redirects to: `/veronica` (detailed dashboard)
- Role: `manager` (same permissions as `partner`)

### 3. **Dashboard Navigation**
- **Primary Dashboard**: `/veronica` - Owner-operator data table
- **Visual Portal**: `/partners/ronyx` - ROnyx branded overview
- **Security**: `/veronica/change-password` - Password management

---

## 🛡️ Role & Permissions

### Manager Role Features:
- ✅ **Owner-Operator Management** - Full CRUD access to her fleet data
- ✅ **RLS Compliance** - Only sees her own data via partner_id filtering
- ✅ **Dashboard Access** - Both detailed and visual portals
- ✅ **Password Management** - Can change password securely
- ✅ **Partner-Level Permissions** - Same access level as other partners

### Permission Level: **4** (Same as Partner)
```typescript
roleHierarchy = {
  'super_admin': 5,  // Monica, Breanna, Shamsa, Sylvia
  'partner': 4,      // Generic partners  
  'manager': 4,      // Veronica (ROnyx)
  'owner': 3,        // Company owners
  'company_admin': 3, // Company administrators
  'staff': 2,        // Regular staff
  'user': 1          // Basic users
}
```

---

## 🗄️ Database Requirements

### Required Tables:
1. ✅ **profiles** - User role and information (already exists)
2. ✅ **owner_operators** - Fleet management data (created)
3. ✅ **RLS policies** - Data isolation security (implemented)

### Execute This SQL (if not done):
```sql
-- Run the owner_operators table creation script
-- File: supabase/owner_operators_table.sql
```

---

## ✅ Testing Checklist

After setup, verify:

- [ ] **Login Works**: Can login with `melidazvl@outlook.com` / `RonynxTest123!`
- [ ] **Auto-Redirect**: Automatically goes to `/veronica`
- [ ] **Data Access**: Can see owner-operator table (sample data)
- [ ] **Navigation**: Can switch between `/veronica` and `/partners/ronyx`
- [ ] **Password Change**: Can update password at `/veronica/change-password`
- [ ] **RLS Security**: Only sees her own data (not other partners)

---

## 🚀 Production URLs

- **Login**: `https://ronyx.movearoundtms.app/login`
- **Dashboard**: `https://ronyx.movearoundtms.app/veronica`
- **ROnyx Portal**: `https://ronyx.movearoundtms.app/partners/ronyx`
- **Settings**: `https://ronyx.movearoundtms.app/veronica/change-password`

---

## 📞 Support Notes

**First Login Instructions for Veronica:**
1. Go to login page using provided URL
2. Use temporary password: `RonynxTest123!`
3. System will redirect to personalized dashboard
4. **IMPORTANT**: Change password immediately at Settings
5. Navigate between dashboards using header navigation

**Troubleshooting:**
- If no data shows: Execute `owner_operators_table.sql` in Supabase
- If access denied: Verify role is set to `manager` in profiles table
- If redirect fails: Check email spelling matches exactly

---

## 🎨 Branding Confirmed

- **Theme**: Dark background (#1E1E1E) with orange accents (#F7931E)
- **Identity**: "ROnyx Fleet Management Portal"
- **Powered By**: "Move Around TMS™"
- **Logo**: Upload to `/public/veronica_logo.png`