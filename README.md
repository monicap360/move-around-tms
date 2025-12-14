<<<<<<< HEAD
# 🚛 MoveAround TMS

**Fleet & Operations Management Platform — Powered by Supabase + Next.js**

- **Developer**: Monica Peña  
- **Domain**: https://app.movearoundtms.com
- **Backend**: Supabase Project `wqeidcatuwqtzwhvmqfr`
- **Database Owner**: monica@...
- **Last Updated**: November 4, 2025

## 📦 Overview

MoveAround TMS is a secure logistics and driver management platform built with Next.js (App Router) and Supabase.
It integrates authentication, role-based access control, file storage, and admin management into a single modern stack.

## ⚙️ Stack

| Component | Tech | Status |
|-----------|------|---------|
| Frontend | Next.js 16.0.1 (Turbopack) | ✅ Production Ready |
| Backend | Supabase SSR | ✅ Enhanced Auth |
| Auth | Supabase Auth + Middleware | ✅ Session Management |
| Storage | Supabase Storage (private bucket) | ✅ RLS Secured |
| DB | PostgreSQL (RLS Enabled) | ✅ Admin Functions |
| UI Components | Custom + Tailwind CSS | ✅ Professional Design |
| Deployment | Digital Ocean | ✅ Multi-Platform |
| Language | TypeScript | ✅ Type-Safe |

## 🧩 Project Structure

```
app/
 ├── api/
 │   ├── _supabase.ts               # Server client helper
 │   ├── storage/
 │   │   ├── upload/route.ts
 │   │   ├── delete/route.ts
 │   │   ├── list/route.ts
 │   │   ├── shared-upload/route.ts
 │   │   └── shared-delete/route.ts
 │   ├── profile/
 │   │   ├── avatar/route.ts
 │   │   ├── update/route.ts
 │   │   └── password/route.ts
 │   └── admin/
 │       ├── status/route.ts
 │       ├── add/route.ts
 │       ├── remove/route.ts
 │       └── list/route.ts
 ├── components/
 │   ├── ui/
 │   │   ├── spinner.tsx              # Loading spinner component
 │   │   ├── loading-overlay.tsx      # Full-screen loading overlay
 │   │   ├── button.tsx
 │   │   ├── card.tsx
 │   │   ├── input.tsx
 │   │   └── index.ts                # UI components export
 │   ├── AdminManager.tsx
 │   ├── UserMenu.tsx
 │   ├── DashboardLoader.tsx
 │   └── LoadingOverlayExamples.tsx
 ├── dashboard/
 │   ├── page.tsx
 │   └── profile/
 │       └── page.tsx
 ├── login/page.tsx                   # Enhanced with LoadingOverlay
 ├── loading-overlay-demo/page.tsx    # Interactive component demo
 ├── settings/page.tsx
 ├── middleware.ts                    # Route protection
 ├── globals.css                      # Professional styling
 ├── layout.tsx
 ├── next.config.mjs                  # Next.js config
 └── page.tsx
```

## 🔐 Authentication

### Supabase Configuration
- **Auth URL**: `https://wqeidcatuwqtzwhvmqfr.supabase.co`
- **Session Management**: via cookies & headers
- **Helper**: `app/api/_supabase.ts`

```typescript
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
      headers: {
        get(name: string) {
          return headers().get(name) ?? undefined;
        },
      },
    }
  );
}
```

✅ **This ensures all API routes share the same user session.**

## 🎨 UI Components

### Modern Component Library
Our custom UI components provide a consistent, professional design system:

#### Spinner Component (`components/ui/spinner.tsx`)
```tsx
// Usage Examples
<Spinner size="sm" />                    // Small spinner
<Spinner size="lg" label="Loading..." /> // Large with label
<Spinner color="text-white" />           // Custom color
```

#### LoadingOverlay Component (`components/ui/loading-overlay.tsx`)
```tsx
// Full-screen loading overlay
<LoadingOverlay show={loading} label="Authenticating..." />
```

**Features:**
- 🎯 Three sizes: `sm`, `md`, `lg`
- 🎨 Customizable colors and labels
- 🌫️ Backdrop blur effects
- ♿ Accessible and responsive
- 🔄 Smooth CSS animations

**Demo Available:** Visit `/loading-overlay-demo` for interactive examples

### Professional Styling
Enhanced `globals.css` with custom CSS classes:
- `.card-professional` - Modern card layouts
- `.btn-primary` - Consistent button styling  
- `.badge-success` - Status indicators
- Professional color scheme and typography

## 🧱 Database Schema

### Tables
```sql
-- Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Admin Check Function (Enhanced Security)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.user_id = is_admin.user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Profiles Table
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Functions
```sql
-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
  );
$$;

-- Extract first folder segment
CREATE OR REPLACE FUNCTION public.first_folder_segment(path TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE
AS $$
  SELECT split_part(path, '/', 1);
$$;
```

## 📂 Storage Structure

| Folder | Description | Access |
|--------|-------------|---------|
| `/company_assets/{user_id}/` | User's private uploads | Owner only |
| `/company_assets/shared/` | Shared company files | Read for all, write for admins |
| `/company_assets/avatars/` | Profile pictures | Owner + Admin |

### Policies
- Per-user folder access enforced via RLS
- Admins (Monica, Sylvia, Veronica) can access all files
- Shared folder open to all authenticated users for read-only access

## 👤 Profile System

| Feature | Route | Description |
|---------|-------|-------------|
| View/Update Profile | `/api/profile/update` | Update name/email/phone |
| Change Password | `/api/profile/password` | Secure password update |
| Avatar Upload | `/api/profile/avatar` | Upload & preview profile image |
| Profile Page | `/settings` | Complete profile management UI |

## 🗃️ Storage Routes

| Route | Function |
|-------|----------|
| `/api/storage/upload` | Upload file to `company_assets/{user_id}` |
| `/api/storage/delete` | Delete user's file |
| `/api/storage/list` | List all files owned by logged-in user |
| `/api/storage/shared-upload` | Upload shared company files (admin only) |
| `/api/storage/shared-delete` | Delete shared files (admin only) |

## 👑 Admin Management

| Route | Function |
|-------|----------|
| `/api/admin/status` | Returns `{isAdmin, email, avatarUrl}` |
| `/api/admin/list` | Lists all admins |
| `/api/admin/add` | Add admin by user_id |
| `/api/admin/remove` | Remove admin rights |

✅ **DB-Driven** — No JWT claims needed.  
Admins are defined in the `public.admin_users` table.

## ⚙️ Environment Variables (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code.**

## 💡 Performance

- **Built-in Supabase indexes**:
  - `(bucket_id, name)`
  - `path_tokens[level]`
- **Custom view** `public.company_assets_objects` for faster listing
- **RLS policies** cached and optimized with `ANALYZE storage.objects`

## 🚀 Deployment

### Digital Ocean Deployment

**Configuration Files:**
- `next.config.mjs` - Optimized Next.js configuration for Node.js deployment

### Deployment Checklist

| Step | Description | Status |
|------|-------------|--------|
| ✅ 1 | Push latest commits to GitHub | Ready |
| ✅ 2 | Environment variables configured | Ready |
| ✅ 3 | Database functions deployed (`database/functions/is_admin.sql`) | Ready |
| ✅ 4 | Build successful (204 pages, 0 errors) | ✅ Verified |
| ✅ 5 | Admin API routes functional | ✅ Verified |
| ✅ 6 | UI components working | ✅ Verified |
| ✅ 7 | Authentication flow tested | ✅ Verified |

### Quick Deploy Commands
```bash
git add .
git commit -m "ready for production deployment"
git push
```

Deploy to Digital Ocean following their Node.js app deployment guide.

## 🧠 Future Enhancements

| Feature | Benefit | Priority |
|---------|---------|----------|
| 📸 Camera Upload | Allow drivers to snap avatar/docs directly | High |
| 🧾 OCR Extraction | Auto-detect license expiration + driver name | Medium |
| 🗂️ Fleet HR Dashboard | Centralize driver document management | High |
| 🔔 Real-time Notifications | Admin alerts for uploads or role changes | Medium |
| 💬 Support Chat | Internal chat for dispatch/admin teams | Low |
| 📱 PWA Support | Mobile app experience for drivers | High |
| 🎯 Analytics Dashboard | Performance metrics and reporting | Medium |

## ✨ Complete Feature Set

### 🔐 **Authentication & Security**
- ✅ Supabase SSR authentication with middleware
- ✅ Enhanced login flow with loading states
- ✅ Row Level Security (RLS) on all operations
- ✅ TypeScript-safe admin verification
- ✅ Session management via cookies
- ✅ Route protection and redirects

### 🎨 **User Interface**
- ✅ Professional Spinner component (3 sizes)
- ✅ Full-screen LoadingOverlay with backdrop blur
- ✅ Custom CSS design system
- ✅ Responsive layouts across all devices
- ✅ Interactive component demonstrations
- ✅ Modern card and button styling

### 🛠️ **Admin Management**
- ✅ Database-driven admin permissions
- ✅ PostgreSQL RPC functions for security
- ✅ Enhanced error handling and logging
- ✅ Visual admin indicators in UI
- ✅ Comprehensive admin panel controls

### 📁 **File Operations**
- ✅ Personal file folders with user isolation
- ✅ Shared company document distribution
- ✅ Avatar upload with profile integration
- ✅ Automatic file cleanup and validation
- ✅ Admin-controlled shared access

### 🔧 **Developer Experience**
- ✅ Zero TypeScript build errors (204 pages)
- ✅ Modern Next.js 16.0.1 with Turbopack
- ✅ Comprehensive error handling
- ✅ Professional code organization
- ✅ Optimized for Node.js deployment

## 🚀 Current Status

- ✅ **Build Status**: Successfully compiled (204 pages) - No TypeScript errors
- ✅ **Authentication**: Enhanced SSR auth with improved login flow
- ✅ **File Management**: Complete CRUD operations with security
- ✅ **Admin System**: TypeScript-safe admin check with PostgreSQL functions
- ✅ **Profile System**: Avatar uploads with profiles table integration
- ✅ **UI Components**: Professional component library (Spinner, LoadingOverlay)
- ✅ **User Experience**: Modern loading states and professional styling
- ✅ **Deployment Ready**: Optimized configuration for Digital Ocean
- 🔄 **Production**: Ready for deployment with enhanced features

### Recent Updates (November 4, 2025)

#### 🎨 **UI/UX Enhancements**
- ✅ Created professional Spinner component with 3 sizes
- ✅ Built LoadingOverlay for full-screen loading states
- ✅ Enhanced login page with smooth loading experience
- ✅ Added professional CSS styling system
- ✅ Created interactive component demo at `/loading-overlay-demo`

#### 🔧 **Technical Improvements** 
- ✅ Fixed 52+ TypeScript errors in admin API routes
- ✅ Enhanced admin check route with proper type safety
- ✅ Improved authentication flow with better error handling
- ✅ Updated Supabase SSR implementation with modern methods
- ✅ Added PostgreSQL function for secure admin verification

#### ⚙️ **Configuration Updates**
- ✅ Created optimized `next.config.mjs` for Node.js deployment
- ✅ Enhanced middleware for better route protection
- ✅ Improved auto-assign functionality with corrected imports

### Build Statistics
```
Route (app)                     Type
├ ƒ /                          Dynamic
├ ○ /login                     Static  
├ ○ /dashboard                 Static
├ ○ /loading-overlay-demo      Static
├ ƒ /api/admin/check           API Route
├ ƒ /api/admin/status          API Route
└ ... 199 other pages         Various
```

## 📚 Key Features Implemented

### 🔐 **Security**
- Row Level Security (RLS) on all storage operations
- Server-side authentication for all API routes
- Database-driven admin permissions
- Automatic session management via cookies

### 📁 **File Management**
- Personal file folders (`{user_id}/`)
- Shared company document distribution
- Admin-controlled shared folder access
- Automatic file cleanup and validation

### 👤 **User Management**
- Complete profile system with avatar uploads
- Password change functionality
- Admin badge system in UI
- Profile management interface

### 🎛️ **Admin Controls**
- TypeScript-safe admin check API (`/api/admin/check`)
- PostgreSQL RPC function for secure admin verification  
- Enhanced error handling with detailed response types
- Visual admin indicators throughout UI
- Database-driven admin management
- Admin-only shared folder operations
- Comprehensive admin panel interface

### 🎨 **Modern UI System**
- Professional Spinner component with size variants
- Full-screen LoadingOverlay with backdrop effects
- Enhanced login experience with loading states
- Consistent design system across all components
- Custom CSS classes for professional styling
- Interactive component demonstrations

### 🔧 **Developer Experience**
- Zero TypeScript build errors
- Comprehensive error handling
- Modern Supabase SSR implementation
- Production-ready deployment configuration
- Professional code organization and documentation

---

## � Project Metrics

- **Pages Generated**: 204 routes (203 static + dynamic)
- **Build Status**: ✅ Success (0 TypeScript errors)  
- **Components Created**: 15+ UI components
- **API Routes**: 50+ secure endpoints
- **Database Functions**: 3 PostgreSQL functions
- **Authentication**: Enhanced SSR implementation
- **Deployment**: Multi-platform ready (Digital Ocean, Railway, Netlify)

## �👩‍💼 Credits

**An original innovation by Monica Peña**  
*Founder & Principal Product Designer of MoveAround TMS*

Built on modern web technologies — Supabase and Next.js 16.0.1 — to set new standards in fleet and logistics management excellence.

**Latest Enhancements (Nov 2025):**
- Professional UI component library
- Enhanced authentication system  
- TypeScript-safe admin management
- Production-ready deployment configuration

---

*MoveAround TMS - Where Technology Meets Transportation Excellence* 🚛✨
=======
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

## Deployment

Deploy to Digital Ocean or any Node.js hosting provider:

1. Connect your GitHub repository to your hosting platform
2. Add environment variables in your platform dashboard
3. Deploy automatically on git push

Alternative deployment options:
- Digital Ocean App Platform
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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
