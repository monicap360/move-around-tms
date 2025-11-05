# Ronyx Logistics TMS™

Built for those who move

A comprehensive Transportation Management System (TMS) for Ronyx Logistics LLC, featuring:
- **OCR ingestion** for aggregate tickets and HR documents (Driver License, Medical Certificates)
- **Automated partner & driver matching** with confidence scoring
- **Manager review workflows** for ticket approval and HR compliance
- **Payroll summaries** (W2/1099, employer taxes, Friday-based weekly views)
- **Realtime notifications** for expiring documents
- **Secure admin APIs** guarded by bearer token
- **Supabase** backend (auth, database, storage, edge functions)

---

## Tech Stack

- **Next.js 16** (App Router, React 19, Server Components)
- **Tailwind CSS v4** with custom directives
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **TypeScript**
- **Google Cloud Vision** (OCR via Edge Functions)
- **lucide-react** icons

---

## Development

Install dependencies:
```bash
npm ci
```

Run dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Build

Generate standalone bundle:
```bash
npm run build
```

Outputs:
- `.next/standalone/` — Node server
- `.next/static/` — Static assets
- `public/` — Public assets

---

Deployment
Deploy to Vercel (Recommended):

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

Alternative deployment options:
- Netlify
- Railway
- Any Node.js hosting provider

Visit `/api/health` to verify environment setup after deployment.

---

## Environment Variables

Create `.env.local` (not committed):

```bash
# Public (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS=yourcompany.com

# Server-only
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ADMIN_TOKEN=your-secret-admin-token  # used only by /api/admin/*; UI now calls non-admin proxies
SUPABASE_WEBHOOK_SECRET=your-webhook-secret
OPENAI_API_KEY=sk-...  # Optional for LLM summaries

# SMTP (for real outgoing emails)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-smtp-password
MAIL_FROM="Ronyx Logistics LLC <quotes@ronyxlogistics.com>"
RECAPTCHA_SECRET=your-recaptcha-secret  # optional: enable server verification on /api/quote-request
```

---

## Email Configuration

For production email delivery, configure:

1. **SMTP Provider**: Use a service like SendGrid, Mailgun, or AWS SES
2. **DNS Records**: Set up SPF, DKIM, and DMARC records for your domain  
3. **Environment Variables**: Add SMTP credentials to your hosting platform
4. **Test Delivery**: Use `/api/health` to verify SMTP configuration

Consult your email provider's documentation for specific DNS record values.

---

## Database Setup

1. Create a Supabase project
2. Run migrations in SQL Editor in order (001–019) from `db/migrations/`
3. Enable Realtime for `public.notifications` in Supabase → Settings → Realtime

---

## Supabase Edge Functions

Deploy these to your Supabase project:

```bash
supabase functions deploy ocr-scan --project-ref <your-ref>
```

Set env vars in Supabase dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Google Vision credentials (service account)

---

## Testing

- **Health check**: `GET /api/health` → JSON with env var presence
- **Env health UI**: `/admin/env` → Visual check of required vars
- **Upload test**: `/hr/upload` → Upload a doc, see OCR result
- **Notifications**: Approve a doc expiring <30 days → Check bell for alert

---

## License

Proprietary — © 2025 Ronyx Logistics LLC. All rights reserved.

---

**Built with ❤️ for those who move.**

---

## E‑sign (MVP)

This app includes a minimal in‑house e‑signature flow backed by Supabase Storage and PostgreSQL tables (`esign_envelopes`, `esign_recipients`, `esign_events`).

Prereqs:
- Create a private Supabase Storage bucket named `esign`.
- Ensure server env vars are set: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_TOKEN`.

Endpoints:
- POST `/api/admin/esign/envelopes` (admin, Bearer `ADMIN_TOKEN`)
   - Body: `{ document_type: 'Quote' | 'Invoice' | 'Other', related_id?: string, filename: string, pdf_base64: string, recipients: [{ name, email, role?: string }] }`
   - Stores original PDF under `esign/envelopes/<id>/original.pdf`, creates recipients with tokens, returns signing URLs: `/esign/<token>`
- GET `/api/esign/[token]`
   - Returns envelope info and a short‑lived signed URL to view the PDF
- POST `/api/esign/[token]`
   - Body: `{ signature_base64: string }` (PNG data URL without the prefix)
   - Stamps the signature onto the last page and uploads `envelopes/<id>/signed.pdf`; updates statuses and logs events

Signer UI:
- Public page `/esign/[token]` renders the PDF in an iframe with a simple signature pad. When submitted, the document is stamped and status advances to `InProgress` or `Completed` when all recipients have signed.

Notes:
- The `esign` bucket should remain private; the app generates short‑lived signed URLs for viewing.
- Multi‑recipient envelopes stamp progressively onto the same `signed.pdf`.
- Extend as needed for decline/reassign flows and email delivery.
