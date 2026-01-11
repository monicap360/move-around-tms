# PRODUCTION DEPLOYMENT GUIDE for app.movearoundtms.com

## 🚀 IMMEDIATE FIXES NEEDED

### Step 1: Update Supabase Dashboard (CRITICAL)

1. **Go to**: https://supabase.com/dashboard/project/[your-project]/auth/url-configuration
2. **Set Site URL to**: `https://app.movearoundtms.com`
3. **Add these Redirect URLs**:
   ```
   https://app.movearoundtms.com/auth/callback
   https://app.movearoundtms.com/
   https://app.movearoundtms.com/login
   https://app.movearoundtms.com/**
   ```
4. **Save and wait 2-3 minutes**

### Step 2: Set Environment Variables on Hosting Provider

Add these to your hosting provider's environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ
NODE_ENV=production
```

### Step 3: Build and Deploy

```bash
# In your project root
npm run build:production

# Upload the generated files to your web hosting
# Usually the 'out' or '.next' folder depending on your config
```

### Step 4: Test Production URLs

After deployment, test these URLs:

- https://app.movearoundtms.com/login
- https://app.movearoundtms.com/auth-test
- https://app.movearoundtms.com/

### Step 5: If Still Having Issues

1. **Check browser console** for errors
2. **Check network tab** for failed requests
3. **Verify environment variables** are set correctly
4. **Check Supabase auth logs** in dashboard

## 🔧 HOSTING PROVIDER SPECIFIC NOTES

### For SiteGround/cPanel:

1. Upload files to `public_html` folder
2. Set environment variables in cPanel → Node.js App
3. Enable Node.js if not already enabled

### For Vercel:

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### For Netlify:

1. Drag and drop build folder to Netlify
2. Set environment variables in site settings
3. Configure redirects for SPA

## ⚡ QUICK TEST

After making these changes, try logging in at:
https://app.movearoundtms.com/login

The authentication should work exactly like localhost!
