# Ronyx Supabase Setup

## 1. Create Supabase Project

Create a new Supabase project:

- Name: `ronyx-movearoundtms`
- Region: `US East (Virginia)` (closest to Texas)
- Pricing: Free tier to start

Upgrade path:

- Pro: $25/month (8GB DB, 100GB storage, 500MB Edge Functions)
- Enterprise: Custom

## 2. Apply Ronyx Schema

Run `sql/ronyx-schema.sql` in the Supabase SQL Editor.

## 3. Storage Buckets

Use `lib/supabase/storage.ts` to initialize:

- `ronyx-tickets`
- `ronyx-documents`
- `ronyx-driver-files`
- `ronyx-branding`

## 4. Edge Function (Ticket OCR)

Deploy `supabase/functions/process-ticket/index.ts` and set the following secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_VISION_CREDENTIALS`

## 5. Next.js Environment Variables

Add these to `.env.local` (or Vercel dashboard):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

GOOGLE_VISION_API_KEY=your-google-vision-key
STRIPE_SECRET_KEY=your-stripe-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

NEXT_PUBLIC_RONYX_TENANT_ID=ronyx
NEXT_PUBLIC_RONYX_TENANT_NAME="Ronyx Transportation"
NEXT_PUBLIC_DISABLE_PIT_MODULE=true
```

## 6. Deploy (Vercel + Supabase)

Use `vercel.json` at repo root for Vercel deployment configuration.
