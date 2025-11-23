# SiteGround Deployment Instructions

## Current Status
- ✅ Application builds successfully
- ✅ Authentication bypassed for direct access
- ✅ All frontend pages are static-ready

## For SiteGround Deployment:

### Option 1: Use SiteGround Node.js (if available)
1. Check if your SiteGround plan supports Node.js applications
2. If yes, upload the entire project and follow their Node.js setup guide

### Option 2: Static Deployment (Most Compatible)
1. The built files are in the `.next` folder
2. You need the static pages and assets

### Immediate Solution: 
Since you need Sylvia to access it now, I recommend:

**Use Vercel (Free) temporarily:**
```bash
npm install -g vercel
vercel --prod
```
This gives you a URL immediately that you can point app.movearoundtms.com to.

**Or use Netlify:**
1. Drag and drop the `.next/static` folder to Netlify
2. Point your domain to the Netlify URL

## Files to Upload to SiteGround (if doing static):
- All files from `.next/static/`
- index.html (needs to be created)
- Configure subdomain app.movearoundtms.com to point to the uploaded files

## 🚨 SECURITY ALERT: Keys Exposed!

**IMMEDIATE ACTION REQUIRED:**
Your Supabase keys have been exposed in this repository. You must:

1. **Rotate your Supabase keys immediately** in your Supabase dashboard
2. **Remove all exposed keys** from committed files
3. **Use environment variables** for all sensitive data

## Environment Variables for Production

Provide the following environment variables in your hosting provider's secret store (**NEVER commit these**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE
SUPABASE_SERVICE_KEY=YOUR_NEW_SERVICE_KEY_HERE
```

**Security Best Practices:**
- Use your platform's environment/secret settings (Vercel, Netlify, SiteGround)
- Never commit `.env.local`, `.env.production`, or config files with keys
- Always use placeholder values in documentation
- Regenerate keys immediately if exposed

## Key Rotation Steps:
1. Go to Supabase Dashboard → Settings → API
2. Click "Reset" next to each exposed key
3. Update your environment variables with new keys
4. Redeploy your application