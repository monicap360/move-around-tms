# Company Assets API Documentation

## Overview

The Company Assets system provides secure, user-scoped storage for company logos and ticket templates using Supabase Row Level Security (RLS).

## Database Schema

```sql
-- Table: public.company_assets
create table public.company_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  asset_type text check (asset_type in ('company_logo','ticket_template')) not null,
  file_path text not null,
  original_filename text not null,
  description text,
  file_size bigint,
  mime_type text,
  tags text[],
  metadata jsonb,
  created_at timestamptz default now()
);
```

## Security

- **Row Level Security (RLS)** enabled
- Users can only access their own assets
- Automatic user_id assignment on insert
- Full CRUD policies for authenticated users

## API Endpoints

### GET /api/company-assets

Retrieve company assets for the authenticated user

**Query Parameters:**

- `type` (optional): Filter by asset type (`company_logo` | `ticket_template`)
- `latest` (optional): Get only the most recent asset (`true`)
- `tags` (optional): Filter by tags (comma-separated)

**Example:**

```javascript
// Get all assets
const response = await fetch("/api/company-assets");

// Get only logos
const logos = await fetch("/api/company-assets?type=company_logo");

// Get latest logo
const latestLogo = await fetch(
  "/api/company-assets?type=company_logo&latest=true",
);
```

### POST /api/company-assets

Create a new company asset

**Required Fields:**

- `asset_type`: `'company_logo'` | `'ticket_template'`
- `file_path`: Storage path to the file
- `original_filename`: Original filename

**Optional Fields:**

- `description`: Asset description
- `file_size`: File size in bytes
- `mime_type`: MIME type (e.g., 'image/png')
- `tags`: Array of tags for categorization
- `metadata`: Additional JSON metadata

**Example:**

```javascript
const newAsset = await fetch("/api/company-assets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    asset_type: "company_logo",
    file_path: "/uploads/logos/company-logo.png",
    original_filename: "company-logo.png",
    description: "Main company logo",
    file_size: 15432,
    mime_type: "image/png",
    tags: ["logo", "primary", "branding"],
  }),
});
```

### GET /api/company-assets/[id]

Get a specific asset by ID

### PUT /api/company-assets/[id]

Update an existing asset (description, tags, metadata only)

### DELETE /api/company-assets/[id]

Delete a specific asset

### GET /api/company-assets/logo/current

Get the most recent company logo

## TypeScript Types

```typescript
interface CompanyAsset {
  id: string;
  user_id: string | null;
  asset_type: "company_logo" | "ticket_template";
  file_path: string;
  original_filename: string;
  description?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}
```

## Service Class Usage

### Database Service

```typescript
import { CompanyAssetsService } from "@/lib/services/company-assets";

// Get all assets
const { data, error } = await CompanyAssetsService.getAssets();

// Get logos only
const logos = await CompanyAssetsService.getAssets("company_logo");

// Create new asset
const newAsset = await CompanyAssetsService.createAsset({
  asset_type: "company_logo",
  file_path: "/path/to/file",
  original_filename: "logo.png",
});

// Get current logo
const currentLogo = await CompanyAssetsService.getCurrentLogo();
```

### Storage Service

```typescript
import { CompanyAssetsStorageService } from "@/lib/services/company-assets-storage";

// Upload logo
const logoUpload = await CompanyAssetsStorageService.uploadLogo(
  file,
  "company-logo.png",
);

// Upload ticket template
const templateUpload =
  await CompanyAssetsStorageService.uploadTicketTemplate(file);

// Get public URL
const publicUrl =
  await CompanyAssetsStorageService.getPublicUrl("logos/logo.png");

// Validate file before upload
const validation = CompanyAssetsStorageService.validateFileType(
  file,
  "company_logo",
);
if (!validation.valid) {
  console.error(validation.error);
}

// List files in folder
const files = await CompanyAssetsStorageService.listFiles("logos");

// Delete file
await CompanyAssetsStorageService.deleteFile("logos/old-logo.png");
```

## File Validation

The system validates uploaded files:

### Size Limits

- Maximum file size: **10MB**

### Allowed File Types

**Company Logos:**

- `image/jpeg`, `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

**Ticket Templates:**

- All image formats above
- `application/pdf`
- `text/plain`
- `application/json`

### Storage Structure

```
company_assets/
├── logos/
│   ├── logo_1234567890.png
│   └── company-logo.svg
└── templates/
    └── tickets/
        ├── template_1234567890.pdf
        └── ticket-format.json
```

## Storage Setup

The system uses Supabase Storage with secure policies for file management:

### Storage Policies

```sql
-- Allow authenticated users to upload into allowed prefixes
create policy "upload_company_assets"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company_assets'
  and (
    position('logos/' in name) = 1
    or position('templates/tickets/' in name) = 1
  )
);

-- Allow authenticated users to read from the bucket
create policy "read_company_assets"
on storage.objects
for select to authenticated
using (bucket_id = 'company_assets');
```

### File Upload API

#### POST /api/company-assets/upload

Upload files with automatic storage and database record creation

**Form Data:**

- `file`: File to upload (required)
- `asset_type`: `'company_logo'` | `'ticket_template'` (required)
- `description`: Asset description (optional)
- `tags`: Comma-separated tags (optional)
- `metadata`: JSON metadata string (optional)

**Example:**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("asset_type", "company_logo");
formData.append("description", "Main company logo");
formData.append("tags", "logo,primary,branding");

const response = await fetch("/api/company-assets/upload", {
  method: "POST",
  body: formData,
});
```

#### GET /api/company-assets/files/[...path]

Get public or signed URLs for files

**Query Parameters:**

- `signed`: Get signed URL (`true` | `false`)
- `expires`: Expiration time in seconds (default: 3600)

**Example:**

```javascript
// Get public URL
const publicUrl = await fetch("/api/company-assets/files/logos/logo.png");

// Get signed URL (for private access)
const signedUrl = await fetch(
  "/api/company-assets/files/logos/logo.png?signed=true&expires=7200",
);
```

## Migration

Run both migration files to set up the complete system:

```bash
# Apply the migrations to your Supabase database
supabase db push
```

Or execute the SQL directly in your Supabase SQL editor:

1. `supabase/migrations/20241101_create_company_assets.sql` - Table and RLS
2. `supabase/migrations/20241101_create_company_assets_storage.sql` - Storage policies

## Features

- ✅ User-scoped asset management with RLS
- ✅ Support for company logos and ticket templates
- ✅ Flexible tagging system
- ✅ JSON metadata storage
- ✅ File size and MIME type tracking
- ✅ Server-side authentication integration
- ✅ TypeScript type safety
- ✅ REST API with full CRUD operations
