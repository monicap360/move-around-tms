# Ronyx Environment Variables

Create a local `.env.ronyx` file with the following contents:

```
RONYX_TENANT_ID=ronyx
RONYX_TENANT_NAME="Ronyx Transportation"
RONYX_DOMAIN=ronyx.movearoundtms.com

RONYX_DATABASE_URL=postgresql://ronyx_user:password@localhost:5432/ronyx_db
RONYX_DATABASE_SCHEMA=ronyx_schema
RONYX_REDIS_URL=redis://localhost:6379/1

RONYX_GOOGLE_VISION_API_KEY=your_key_here
RONYX_STRIPE_API_KEY=sk_live_...
RONYX_TWILIO_ACCOUNT_SID=AC...
RONYX_MAPBOX_API_KEY=pk.ey...

RONYX_ENABLE_TICKET_OCR=true
RONYX_ENABLE_AUTO_RECONCILIATION=true
RONYX_ENABLE_PAYROLL_AUTOMATION=true
RONYX_DISABLE_PIT_MODULE=true

RONYX_TXDOT_COMPLIANCE_REQUIRED=true
RONYX_FMCSA_CLEARINGHOUSE_REQUIRED=true
RONYX_DRUG_TESTING_REQUIRED=true
```

Supabase + Vercel environment variables (when deploying via Supabase):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

NEXT_PUBLIC_RONYX_TENANT_ID=ronyx
NEXT_PUBLIC_RONYX_TENANT_NAME="Ronyx Transportation"
NEXT_PUBLIC_DISABLE_PIT_MODULE=true
```
