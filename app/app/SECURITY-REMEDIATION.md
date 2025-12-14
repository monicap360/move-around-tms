# 🔒 SECURITY ALERT: Credential Rotation Required

## Immediate Action Required

**The following Supabase credentials were exposed in code and must be rotated immediately:**

- **Project URL**: `https://wqeidcatuwqtzwhvmqfr.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ`

## Steps to Secure Your Project

### 1. Rotate Supabase Keys (URGENT)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `wqeidcatuwqtzwhvmqfr`
3. Navigate to **Settings** → **API**
4. Click **"Reset Database Password"** and **"Reset JWT Secret"**
5. Copy the new anon key and service key

### 2. Update Environment Variables

Create a new `.env.local` file with your new credentials:

```bash
# Supabase Configuration (USE NEW ROTATED KEYS)
NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_NEW_ANON_KEY>
SUPABASE_SERVICE_KEY=<YOUR_NEW_SERVICE_KEY>

# JWT Secret for enhanced security
JWT_SECRET=<GENERATE_NEW_RANDOM_STRING>

# Admin Token for compliance operations
ADMIN_TOKEN=<GENERATE_SECURE_ADMIN_TOKEN>
```

### 3. Update Production Deployments

Update these environment variables in your hosting platforms:

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
```

**Netlify:**
- Go to Site Settings → Environment Variables
- Update each variable with new values

**SiteGround/cPanel:**
- Add environment variables in your hosting control panel

### 4. Configure Supabase Auth URLs

In your Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://app.movearoundtms.com`
- **Additional Redirect URLs**: `https://app.movearoundtms.com/auth/callback`

### 5. Security Best Practices Going Forward

✅ **DO:**
- Store all secrets in environment variables
- Use your hosting provider's secret management
- Rotate credentials regularly (every 90 days)
- Use `.env.local` for local development only

❌ **DON'T:**
- Commit `.env.local` to git
- Share credentials in code, comments, or documentation
- Use placeholder/default values in production
- Store secrets in client-side code

### 6. Verify Security

After rotation, verify your application works:

```bash
# Test local development
npm run dev

# Test build
npm run build

# Test authentication flow
# Visit /login → should redirect properly
# Visit /auth/callback → should handle OAuth
```

## Timeline

- **Immediate**: Rotate keys in Supabase Dashboard
- **Within 1 hour**: Update all production deployments
- **Within 24 hours**: Verify all functionality works
- **Ongoing**: Monitor for any authentication issues

## Questions?

If you need help with credential rotation or deployment updates, refer to:
- Supabase docs: https://supabase.com/docs/guides/getting-started
- Your hosting provider's environment variable documentation