# Move Around TMS™ – SiteGround Deployment Guide

This guide covers deploying the Move Around TMS Next.js dashboard to SiteGround using their Node.js hosting environment.

---

## Prerequisites

- SiteGround Node.js hosting plan (or similar Node-capable shared/cloud hosting)
- SSH or SFTP access (or use Site Tools File Manager)
- Supabase project with Edge Functions deployed (`ocr-scan`, `hr-doc-scan`, etc.)
- Environment variables from `.env.local` (production values)

---

## Step 1: Configure Next.js for Standalone Build

We've already set `output: "standalone"` in `next.config.ts` so Next will generate a self-contained Node server.

---

## Step 2: Build Locally

Open PowerShell in the project root (`C:\Users\mptra\OneDrive\Desktop\move-around-tms`) and run:

```powershell
npm ci
npm run build
```

This creates:
- `.next/standalone/` — Production Node server (includes `server.js` and minimal dependencies)
- `.next/static/` — Static assets (JS, CSS, images)
- `public/` — Public assets (fonts, icons, etc.)

---

## Step 3: Upload to SiteGround

### Option A: SFTP/File Manager

1. Connect via SFTP or Site Tools → File Manager.
2. Navigate to `/public_html_movearoundtms.app/` (your domain folder).
3. Upload these folders/files:
   - `.next/` (entire folder or at least `.next/standalone` and `.next/static`)
   - `public/`
   - `package.json` (optional, for reference)

Final server structure:
```
/public_html_movearoundtms.app/
  .next/
    standalone/
      server.js
      ...
    static/
      ...
  public/
    ...
```

### Option B: Git (Recommended for CI/CD)

1. In Site Tools → Devs → Git, create a Git repository mapped to `/public_html_movearoundtms.app/`.
2. Push your local repo to the SiteGround Git remote:
   ```powershell
   git remote add siteground <git-url-from-site-tools>
   git push siteground main
   ```
3. SSH into the server:
   ```bash
   cd /public_html_movearoundtms.app
   npm ci
   npm run build
   ```
4. Restart the Node.js app from Site Tools.

---

## Step 4: Configure Node.js Application in Site Tools

1. Go to Site Tools → Devs → Node.js → **Create Application**.
2. Set:
   - **Application Root:** `public_html_movearoundtms.app`
   - **Application Start File:** `.next/standalone/server.js`
   - **Node Version:** 18.x or 20.x (whatever SiteGround supports; Next.js 16 requires Node ≥18)
3. Add Environment Variables (click "Add Variable" for each):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ADMIN_TOKEN`
   - `SUPABASE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS`
   - `OPENAI_API_KEY` (optional, for LLM summaries)
4. Save and **Start** the application.

SiteGround will run the app behind a reverse proxy. Your domain/subdomain will route requests to the Node server.

---

## Step 5: Configure Domain/Subdomain

- If `movearoundtms.app` is your main domain:
  - Set the **Document Root** to `/public_html_movearoundtms.app/` in Site Tools → Domain.
- If using a subdomain (e.g., `app.movearoundtms.app`):
  - Create the subdomain in Site Tools → Domain and point it to the same folder.

No `.htaccess` needed—Node handles all routing.

---

## Step 6: Verify Deployment

1. Visit your site: `https://movearoundtms.app` (or your configured domain).
2. Check the health endpoint: `https://movearoundtms.app/api/health`
   - Should return JSON with `ok: true` and all env vars present.
3. Test login at `/login` (should connect to Supabase auth).
4. Test HR Upload at `/hr/upload` (should upload to `hr_docs` bucket and call `ocr-scan`).
5. Check the notifications bell in the sidebar (should fetch from `public.notifications`).

---

## Troubleshooting

### Blank page or 502/503 error
- Check Node.js app status in Site Tools. Ensure it's running.
- Verify the Start File is `.next/standalone/server.js` (not `server.js` at root).
- Check server logs in Site Tools → Node.js → Logs.

### Static assets 404 (CSS/JS not loading)
- Ensure `.next/static/` exists at `/public_html_movearoundtms.app/.next/static/`.
- Rebuild locally if missing: `npm run build` and re-upload.

### Supabase connection errors
- Verify env vars are set correctly in Site Tools → Node.js → Application → Environment Variables.
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are exactly as in your Supabase dashboard.
- Confirm `SUPABASE_SERVICE_KEY` is the **service role key** (not anon key).

### Edge Function calls fail
- Ensure Supabase Edge Functions (`ocr-scan`, `hr-doc-scan`) are deployed in your Supabase project.
- Verify the HR Upload page includes the `Authorization: Bearer {anon key}` header in fetch calls.
- Check CORS: Supabase Functions default to `Access-Control-Allow-Origin: *`; if you locked it down, add your domain.

### Realtime notifications not updating
- Enable Realtime for `public.notifications` in Supabase → Settings → Realtime.
- Confirm RLS policies on `public.notifications` allow managers to SELECT (we added this in migration `019_notifications_rls.sql`).

### Missing environment variables
- Visit `/api/health` to see which vars are missing.
- Add them in Site Tools → Node.js → Environment Variables and restart the app.

---

## Post-Deploy Checklist

- [ ] Run database migrations in Supabase SQL Editor (001–019)
- [ ] Deploy Supabase Edge Functions (`ocr-scan`, `hr-doc-scan`, etc.)
- [ ] Set all environment variables in SiteGround Node.js app settings
- [ ] Start the Node.js application
- [ ] Test login, signup, and admin pages
- [ ] Upload an HR document and verify OCR ingestion
- [ ] Approve a document and check that notifications appear in the bell
- [ ] Verify `/api/health` shows all green

---

## Optional: Auto-Deploy via Git Hooks

If using Git deployment:

1. SSH into the server and create a post-receive hook:
   ```bash
   cd /public_html_movearoundtms.app/.git/hooks
   nano post-receive
   ```
2. Add:
   ```bash
   #!/bin/bash
   cd /public_html_movearoundtms.app
   npm ci
   npm run build
   # Restart Node.js app (use Site Tools API or manual restart)
   ```
3. Make executable:
   ```bash
   chmod +x post-receive
   ```
4. Now each `git push` will rebuild the app automatically.

---

## Support

- Next.js standalone docs: https://nextjs.org/docs/pages/api-reference/next-config-js/output
- SiteGround Node.js hosting: https://www.siteground.com/kb/how-to-use-nodejs/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

If you encounter issues, check:
- SiteGround Node.js logs (Site Tools → Node.js → Logs)
- Supabase Edge Function logs (Dashboard → Edge Functions → Logs)
- Browser console for client-side errors

---

**You're all set!** 🚀
