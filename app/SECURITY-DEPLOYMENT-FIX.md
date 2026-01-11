# 🚨 CRITICAL: Security & Deployment Fix Guide

## IMMEDIATE SECURITY ACTIONS REQUIRED

### 🔐 Step 1: Rotate Supabase Keys (URGENT)

Your keys are exposed in 15+ files! Act immediately:

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/wqeidcatuwqtzwhvmqfr
   - Navigate to: Settings → API
2. **Reset Both Keys**:
   - Click "Reset" next to "anon public" key
   - Click "Reset" next to "service_role" key
   - Copy the new keys immediately

3. **Update Environment Variables**:
   ```bash
   # Update these files with NEW keys:
   app/.env.local
   app/.env.production
   ```

### 🧹 Step 2: Clean Repository

Remove exposed keys from these files:

```bash
# Files containing exposed keys:
app/DEPLOYMENT.md                     ✅ FIXED
app/next.config.siteground.js        ⚠️ NEEDS FIX
app/public/env.js                     ⚠️ NEEDS FIX
app/SECURITY-REMEDIATION.md           ⚠️ NEEDS FIX
app/PRODUCTION-DEPLOYMENT-FIX.md      ⚠️ NEEDS FIX
```

## 🚀 DEPLOYMENT SOLUTIONS

### Option 1: Vercel (Recommended - Fast)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Add environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_NEW_ANON_KEY]
# - SUPABASE_SERVICE_KEY=[YOUR_NEW_SERVICE_KEY]
```

### Option 2: Netlify

```bash
# 1. Build the app
npm run build

# 2. Deploy to Netlify
# - Drag .next folder to netlify.com/drop
# - Or connect GitHub repo at netlify.com

# 3. Add environment variables in Netlify dashboard
```

### Option 3: SiteGround (Current Setup)

```bash
# 1. Build static version
npm run build
npm run export  # if available

# 2. Upload files:
# - Upload .next/static/* to public_html/app/
# - Upload pages to public_html/app/
# - Configure domain: app.movearoundtms.com → /public_html/app/
```

## 📋 DEPLOYMENT CHECKLIST

### Before Deploying:

- [ ] Rotate Supabase keys
- [ ] Update .env.local with new keys
- [ ] Update .env.production with new keys
- [ ] Remove keys from all documentation files
- [ ] Test build locally: `npm run build`
- [ ] Test application functionality

### After Deploying:

- [ ] Set environment variables in hosting platform
- [ ] Test login functionality
- [ ] Test admin features
- [ ] Test file upload/download
- [ ] Verify app.movearoundtms.com works

## 🔍 Current Build Status

```bash
# Last successful build:
✅ 205 pages generated
✅ 0 TypeScript errors
✅ All components functional
✅ UI preview available at /ui-preview
```

## 🎯 Quick Fix Commands

```bash
# 1. Fix security immediately:
# Go to Supabase → Reset keys

# 2. Update local environment:
# Edit .env.local with new keys

# 3. Test locally:
npm run build
npm run dev

# 4. Deploy to Vercel (fastest):
vercel --prod

# 5. Point domain:
# app.movearoundtms.com → vercel-url
```

## 📞 Support Access

Once deployed, Sylvia can access:

- **Main App**: https://app.movearoundtms.com
- **UI Demo**: https://app.movearoundtms.com/ui-preview
- **Login**: https://app.movearoundtms.com/login

---

**⚠️ CRITICAL**: Fix security issue first, deploy second!
