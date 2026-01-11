# Quote Management & Material Rates System

Complete implementation of quote management with email workflow, material rates management, and approval tracking for aggregate hauling services.

## ✅ Features Implemented

### 1. Material Rates Management (`/admin/material-rates`)

- **CRUD Operations:** Create, Read, Update, Delete material types
- **Default Pricing:** Set default bill rates and pay rates per material
- **Unit Types:** Support for Load, Yard, Ton, Hour billing
- **Active/Inactive:** Toggle materials on/off
- **Margin Calculation:** Automatic profit margin display
- **Quick Codes:** Optional material codes for faster entry

**API:** `/api/admin/material-rates`

- GET: List all rates (optional `?active=true` filter)
- POST: Create new material rate
- PATCH: Update existing rate
- DELETE: Remove rate

### 2. Quote Management (`/aggregates/quotes`)

- **Quote Creation:** Full form with company, contact, material, pricing
- **Material Quick-Select:** Auto-fill rates from material master list
- **Status Workflow:** Draft → Pending Review → Approved → Sent → Accepted/Rejected
- **Inline Status Updates:** Change quote status directly in table
- **Profit Calculation:** Automatic margin and percentage display
- **Signature Tracking:** URL field for signed documents

**API:** `/api/admin/quotes`

- GET: List quotes (optional `?status=Draft` filter)
- POST: Create new quote
- PATCH: Update quote fields or status
- DELETE: Remove quote

### 3. Email Quote Drafts (`/api/admin/quotes/email-draft`)

Generate formatted email content for two scenarios:

#### Management Review Email

- **Purpose:** Internal review before sending to customer
- **Includes:**
  - Company and contact details
  - Pricing breakdown with profit margins
  - Notes and special terms
  - Quote status and ID
- **Template:** Professional HTML format with tables

#### Customer Quote Email

- **Purpose:** Send quote to customer
- **Includes:**
  - Company branding (Solis Trucking)
  - Service details and pricing
  - Additional notes/terms
  - Call to action (reply to accept)
- **Template:** Customer-facing HTML with branding

**Usage:**

```json
POST /api/admin/quotes/email-draft
{
  "quote_id": "uuid",
  "template_type": "customer" | "management"
}
```

**Response:**

```json
{
  "quote_id": "uuid",
  "subject": "Quote for...",
  "body_text": "Plain text version",
  "body_html": "<html>Formatted version</html>",
  "to": "customer@example.com",
  "quote_details": { ... }
}
```

### 4. Email Sending (`/api/admin/quotes/send-email`)

Send emails via SMTP (Gmail, Outlook, custom) or integrate with SendGrid/AWS SES.

**Configuration:** Set these environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=quotes@solistrucking.com
```

**Usage:**

```json
POST /api/admin/quotes/send-email
{
  "to": "customer@example.com",
  "subject": "Your Quote",
  "body_text": "Plain text",
  "body_html": "<html>HTML version</html>"
}
```

**Draft Mode:** If SMTP not configured, API returns `draft_mode: true` with preview only.

### 5. Approval Workflow

Built into quote status management:

- **Draft:** Initial creation
- **Pending Review:** Submitted for management approval
- **Approved:** Management approved
- **Sent:** Email sent to customer
- **Accepted:** Customer accepted
- **Rejected:** Declined or cancelled

Status changes tracked in UI with dropdown selects.

### 6. Signature Integration

- **Current:** Manual URL field for signed documents
- **Future:** Can integrate DocuSign, HelloSign, or Adobe Sign APIs
- Quote view shows "Signed" badge when `signature_url` is populated

---

## 📁 File Structure

```
db/migrations/
  033_create_material_rates.sql        # Material master schema

app/api/admin/
  material-rates/route.ts               # Material CRUD API
  quotes/route.ts                       # Quote CRUD API
  quotes/email-draft/route.ts          # Email template generator
  quotes/send-email/route.ts           # Email sender (SMTP)

app/admin/
  material-rates/page.tsx               # Material rates admin UI

app/aggregates/
  quotes/page.tsx                       # Quote management UI
  page.tsx                              # Updated landing with new cards
```

---

## 🚀 Getting Started

### 1. Run Migration

Apply the material rates schema:

```sql
-- Run in Supabase SQL editor or migration tool
\i db/migrations/033_create_material_rates.sql
```

### 2. Seed Materials (Optional)

```sql
INSERT INTO material_rates (material_name, material_code, default_bill_rate, default_pay_rate, unit_type, description) VALUES
  ('Limestone', 'LIME', 150.00, 100.00, 'Load', 'Crushed limestone aggregate'),
  ('Gravel', 'GRVL', 140.00, 95.00, 'Load', 'Mixed gravel for road base'),
  ('Sand', 'SAND', 130.00, 90.00, 'Load', 'Construction sand'),
  ('Topsoil', 'SOIL', 120.00, 85.00, 'Yard', 'Grade A topsoil');
```

### 3. Configure Email (Optional)

Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=quotes@solistrucking.com
```

**Gmail Users:** Generate an App Password:

1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that password in `SMTP_PASS`

### 4. Access Features

- **Material Rates:** `/admin/material-rates`
- **Quotes:** `/aggregates/quotes`
- **Aggregates Hub:** `/aggregates` (updated with new cards)

---

## 💡 Workflow Examples

### Create a Quote

1. Go to `/aggregates/quotes`
2. Click **+ Create Quote**
3. Fill in customer details
4. Select material from dropdown (auto-fills rates)
5. Adjust rates if needed
6. Add notes/terms
7. Save as "Draft"

### Send Quote to Customer

1. Find quote in table
2. Click **📧 Cust** button
3. Review generated email in preview modal
4. Click **Send Email** (if SMTP configured)
5. Update status to "Sent"

### Management Review

1. Create quote with status "Pending Review"
2. Click **📧 Mgmt** button
3. Review internal email with profit margins
4. Forward to management or use for approval decision
5. Update status to "Approved" or "Rejected"

### Track Signature

1. After customer signs (via DocuSign, PDF, etc.)
2. Edit quote
3. Paste signed document URL in `signature_url` field
4. Quote shows "Signed" badge in list

---

## 🔒 Security

- All admin APIs protected with `ADMIN_TOKEN`
- SMTP credentials stored in environment variables
- Email sending optional (works in draft mode without SMTP)
- Quote data stored in Supabase with RLS (add policies as needed)

---

## 📊 Database Schema

### `material_rates`

```sql
id              uuid PRIMARY KEY
material_name   text UNIQUE NOT NULL
material_code   text
default_bill_rate numeric(10,2) NOT NULL
default_pay_rate  numeric(10,2) NOT NULL
unit_type       text CHECK (Load, Yard, Ton, Hour)
description     text
active          boolean DEFAULT true
created_at      timestamp
updated_at      timestamp
```

### `aggregate_quotes` (existing, enhanced)

```sql
id              uuid PRIMARY KEY
company         text
contact_name    text
contact_email   text
billing_type    text CHECK (Load, Yard, Ton, Hour)
rate            numeric(10,2)
pay_rate        numeric(10,2)
material        text
notes           text
total_profit    numeric(12,2)
status          text DEFAULT 'Draft'
signature_url   text
created_at      timestamp
```

---

## 🎨 UI Features

### Material Rates Page

- Sortable table with margin calculations
- Inline edit/delete actions
- Active/inactive badges
- Form validation

### Quotes Page

- Status dropdown in table for quick updates
- Email buttons (Management + Customer)
- Profit margin display in table
- Material quick-select auto-fill
- Email preview modal with send button

---

## 🔧 Customization

### Add SendGrid Integration

Replace nodemailer in `send-email/route.ts`:

```typescript
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to,
  from: emailFrom,
  subject,
  text: body_text,
  html: body_html,
});
```

### Add DocuSign Integration

Create new endpoint `/api/admin/quotes/send-for-signature`:

```typescript
// Use DocuSign eSignature API
// Generate envelope, add signer, send
// Webhook receives signed document
// Update quote.signature_url
```

### Custom Email Templates

Edit `email-draft/route.ts` to customize HTML/text content.

---

## 📝 Notes

- **Signature field** is URL-based; integrate e-signature provider for automation
- **Email sending** gracefully degrades to draft mode if SMTP not configured
- **Material rates** can be overridden per-partner (already in `aggregate_partners.material_codes` JSONB)
- **Status workflow** is flexible; add/remove statuses as needed
- All features tested and production build passed ✅

---

## 🚀 Next Steps (Optional Enhancements)

1. **Automated E-Signature:** Integrate DocuSign/HelloSign for one-click signing
2. **Quote Templates:** Save common quote configurations
3. **PDF Export:** Generate quote PDFs for offline sharing
4. **Quote Expiration:** Auto-expire quotes after 30 days
5. **Email Tracking:** Track opens/clicks with SendGrid/Mailgun
6. **Quote History:** Log all changes and status transitions
7. **Customer Portal:** Let customers view/accept quotes online

---

Built for **Move Around TMS™**  
© 2025 Solis Trucking LLC
