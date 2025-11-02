# 🚀 Production Deployment Checklist

## 📋 Pre-Deployment Summary

### ✅ **What We've Built:**
- **🛡️ Database-Driven Admin System** - Scalable admin management with `admin_users` table
- **📁 Complete File Management** - Personal + shared folder system with security  
- **👑 Admin Badge System** - Beautiful visual admin indicator in dashboard
- **🔧 Admin Management UI** - Full CRUD interface for managing admin users
- **🧪 Comprehensive Testing** - 11-test debug suite covering all functionality
- **🏗️ Production Build** - Standalone build ready for deployment

### 🎯 **Build Status:**
- ✅ TypeScript compilation: **SUCCESS**
- ✅ 199 pages generated: **SUCCESS** 
- ✅ Standalone build: **READY**
- ✅ All API routes: **INCLUDED**

---

## 🗂️ **Step 1: Database Migration**

### **1.1 Open Supabase SQL Editor**
1. Go to [supabase.com](https://supabase.com)
2. Navigate to your project
3. Click "SQL Editor" in sidebar

### **1.2 Run Migration Script**
Copy and paste this SQL script:

```sql
-- ===============================================
-- MOVE AROUND TMS - ADMIN SYSTEM MIGRATION
-- ===============================================

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid() 
    AND active = true
  );
END;
$$;

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can see all admin records
CREATE POLICY "Admins can view admin_users" 
ON admin_users FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- Admin users can insert new admin records
CREATE POLICY "Admins can insert admin_users" 
ON admin_users FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

-- Admin users can update admin records
CREATE POLICY "Admins can update admin_users" 
ON admin_users FOR UPDATE 
TO authenticated 
USING (public.is_admin());

-- Admin users can delete admin records
CREATE POLICY "Admins can delete admin_users" 
ON admin_users FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- Update existing company_assets_objects RLS policy
DROP POLICY IF EXISTS "Users can only see their own files or shared files" ON storage.objects;
CREATE POLICY "Users can only see their own files or shared files" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'company_assets' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    (storage.foldername(name))[1] = 'shared' OR
    public.is_admin()
  )
);

-- Update upload policy for shared folder
DROP POLICY IF EXISTS "Users can upload to their own folder or admins to shared" ON storage.objects;
CREATE POLICY "Users can upload to their own folder or admins to shared" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'company_assets' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    ((storage.foldername(name))[1] = 'shared' AND public.is_admin())
  )
);

-- Update delete policy for shared folder
DROP POLICY IF EXISTS "Users can delete their own files or admins can delete shared" ON storage.objects;
CREATE POLICY "Users can delete their own files or admins can delete shared" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'company_assets' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    ((storage.foldername(name))[1] = 'shared' AND public.is_admin())
  )
);

-- Migration complete message
SELECT 'Admin system migration completed successfully!' as status;
```

### **1.3 Add Initial Admins**
After the migration succeeds, run this:

```sql
-- Add Monica, Sylvia, and Veronica as admins
INSERT INTO admin_users (email, role, active) VALUES 
('monica@movearoundtms.com', 'super_admin', true),
('sylvia@movearoundtms.com', 'admin', true),
('veronica@movearoundtms.com', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Verify admins were added
SELECT email, role, active, created_at FROM admin_users ORDER BY created_at;
```

**Expected Result:** Should show 3 admin users added.

---

## 📁 **Step 2: Production Deployment**

### **2.1 Locate Build Files**
Your production files are in:
```
c:\Users\mptra\OneDrive\Desktop\move-around-tms\.next\standalone\
```

### **2.2 SiteGround Upload Process**
1. **Login to SiteGround cPanel**
2. **Open File Manager**
3. **Navigate to your domain folder** (usually `public_html` or similar)
4. **Upload Contents:**
   - Upload the entire contents of `.next\standalone\` folder
   - Include the `public` folder if it exists
   - Make sure `server.js` is in the root

### **2.3 Environment Variables**
Ensure these are set in your hosting environment:
```
SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
NEXTAUTH_URL=https://app.movearoundtms.com
NEXTAUTH_SECRET=[your-secret]
```

### **2.4 Start Application**
- If using Node.js hosting, run: `node server.js`
- If using other hosting, follow their Next.js deployment guide

---

## 🧪 **Step 3: Verification Testing**

### **3.1 Test Authentication**
1. Go to `https://app.movearoundtms.com/login`
2. Login with Monica's account
3. **Expected:** Should redirect to dashboard without 404 errors

### **3.2 Test Admin Badge**
1. Go to `https://app.movearoundtms.com/dashboard`
2. Look for golden "👑 Admin" badge in top-right
3. **Expected:** Badge should be visible for Monica

### **3.3 Test Admin Management**
1. Scroll down on dashboard to "Admin Management" section
2. Try adding a new admin by email
3. Try viewing the admin list
4. **Expected:** All admin functions should work

### **3.4 Test File Management**
1. Go to `https://app.movearoundtms.com/file-manager`
2. Try uploading a personal file
3. Try uploading a shared file (as admin)
4. **Expected:** Both should work without errors

### **3.5 Run Debug Suite**
1. Go to `https://app.movearoundtms.com/debug-upload`
2. Click "Run Debug Tests"
3. **Expected:** All 11 tests should pass with ✅

---

## 🎯 **Success Indicators**

### **✅ Working Correctly:**
- No 404 errors on any authenticated pages
- Monica sees "👑 Admin" badge in dashboard
- Admin Management panel works (add/remove admins)
- File upload/download works for both personal and shared files
- Debug tests pass completely

### **❌ If Problems Occur:**
1. **Check database migration** - Ensure `admin_users` table exists
2. **Verify environment variables** - All Supabase keys correct
3. **Check file permissions** - Ensure `server.js` is executable
4. **Review hosting logs** - Look for startup errors

---

## 📞 **Support Resources**

### **Debug Pages:**
- `https://app.movearoundtms.com/debug-upload` - Comprehensive system testing
- `https://app.movearoundtms.com/api/admin/status` - Check admin status
- `https://app.movearoundtms.com/api/health` - Basic health check

### **Key Features for Monica:**
- **Admin Badge:** Visible confirmation of admin status
- **Admin Management:** Add/remove admins without SQL
- **Shared Files:** Upload documents for all users
- **File Manager:** Full file management interface

---

## 🎉 **Expected Final Result**

Once deployed successfully:
1. **Production 404s FIXED** ✅
2. **Monica has admin badge** ✅  
3. **Database-driven admin system** ✅
4. **Complete file management** ✅
5. **Secure, scalable architecture** ✅

**The Move Around TMS will be fully operational with enterprise-level admin and file management capabilities!**