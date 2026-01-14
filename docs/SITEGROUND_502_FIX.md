# SiteGround 502 Bad Gateway Fix

## The Problem

SiteGround **does NOT support Next.js server-side rendering**. The 502 error happens because:
- Your `next.config.js` has `output: "standalone"` (requires Node.js server)
- SiteGround can't run the Next.js server process
- API routes won't work on SiteGround static hosting

## The Solution: Static Export

We need to generate **static HTML files** that SiteGround can serve directly.

## Step-by-Step Fix

### Step 1: Build Static Files Locally

On your local machine (Windows):

```powershell
# Use the SiteGround-specific config
npm run build:siteground
```

This will create an `/out` directory with all static files.

### Step 2: Upload to SiteGround

1. **Login to SiteGround cPanel**
2. **Open File Manager**
3. **Navigate to**: `public_html/ronyx` (create folder if needed)
4. **Upload ALL files** from the `/out` directory
5. **Set permissions**: 
   - Folders: 755
   - Files: 644

### Step 3: Verify Subdomain Configuration

1. **SiteGround cPanel → Subdomains**
2. **Check**: `ronyx.movearoundms.com` exists
3. **Document Root**: Should be `public_html/ronyx`
4. **SSL**: Enable Let's Encrypt certificate

### Step 4: Test

Visit:
- `https://ronyx.movearoundms.com/ronyx/login`
- `https://ronyx.movearoundms.com/health`

## Important Limitations

### ✅ What WILL Work:
- All frontend pages (React components)
- Supabase client-side authentication
- Static pages and routes
- Client-side JavaScript

### ❌ What WON'T Work:
- API routes (`/api/*`) - These need a Node.js server
- Server-side rendering (SSR)
- Server Actions
- Middleware (runs on server)

## Alternative: Use SiteGround Node.js Application Manager

If you need API routes, try SiteGround's Node.js support:

1. **SiteGround cPanel → Application Manager**
2. **Create Node.js Application**
3. **Point to your project directory**
4. **Set start command**: `npm start`
5. **Set port**: 3000 (or configured port)

**Note**: This may have limitations and may not work well with Next.js.

## Recommended: Hybrid Approach

For best results:

1. **Frontend on SiteGround** (static export)
   - All pages and UI
   - Client-side Supabase auth
   
2. **API on Separate Service** (Railway, Render, Vercel)
   - All `/api/*` routes
   - Server-side operations
   - Connect via environment variables

## Quick Commands

```powershell
# Build for SiteGround
npm run build:siteground

# Check if /out directory was created
dir out

# The /out directory contains everything to upload
```

## Troubleshooting

### Still Getting 502?

1. **Check File Manager**: Ensure files uploaded correctly
2. **Check Permissions**: Folders 755, Files 644
3. **Check .htaccess**: May need to create one for routing
4. **Check Subdomain**: Verify DNS is pointing correctly

### Create .htaccess for SiteGround

Create `public_html/ronyx/.htaccess`:

```apache
RewriteEngine On
RewriteBase /

# Handle Next.js routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Security headers
<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
</IfModule>
```

## Next Steps

1. ✅ Run `npm run build:siteground` locally
2. ✅ Upload `/out` contents to SiteGround
3. ✅ Test the site
4. ⚠️ If you need API routes, consider Railway/Render for backend
