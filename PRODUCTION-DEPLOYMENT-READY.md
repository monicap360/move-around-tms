# Production Deployment Guide - Move Around TMS

## 🚀 Deployment Status: READY FOR PRODUCTION

### Build Summary
✅ **Build Status**: Successfully completed  
✅ **SSR Compatibility**: Fixed alert() calls with safeAlert utility  
✅ **File Management System**: Fully implemented and tested  
✅ **Authentication**: Working locally with Supabase integration  
✅ **Database Optimization**: Using company_assets_objects view for performance  

### What We Accomplished

1. **Fixed Critical SSR Issues**
   - Resolved alert() calls causing build failures
   - Created safeAlert utility for browser/SSR compatibility
   - Maintained user experience while ensuring deployment compatibility

2. **Complete File Management System**
   - ✅ `/api/storage/list` - Optimized file listing with pagination
   - ✅ `/api/storage/upload` - Secure file uploads with validation (50MB limit)
   - ✅ `/api/storage/delete` - Access-controlled file deletion
   - ✅ `/api/storage/signed-url` - Temporary download URLs
   - ✅ `/file-manager` - Full UI with drag-drop, progress bars, file organization

3. **Database Optimization Strategy**
   - Created `company_assets_objects` view to avoid permission battles
   - Implemented `first_folder_segment()` helper function
   - Maintained RLS security while improving query performance

4. **Production Build Configuration**
   - Standalone output for SiteGround hosting
   - Environment variable support
   - TypeScript error handling for deployment
   - Image optimization disabled for static hosting compatibility

### Deployment Files Ready

```
.next/standalone/
├── .next/          # Next.js optimized build
├── node_modules/   # Production dependencies
├── .env.production # Environment variables
├── package.json    # Production package configuration
└── server.js       # Node.js server entry point
```

Static assets:
```
.next/static/       # CSS, JS, and media files (copy to standalone/.next/static/)
public/            # Favicon and public assets (copy to standalone/public/)
```

### SiteGround Deployment Instructions

1. **Upload Files**
   ```bash
   # Upload entire .next/standalone/ directory to your hosting root
   # Copy .next/static/ to standalone/.next/static/
   # Copy public/ directory to standalone/public/
   ```

2. **Environment Variables**
   Create `.env.production` in standalone directory:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Database Configuration (if needed)
   DATABASE_URL=your_database_url_here
   
   # Domain Configuration
   NEXTAUTH_URL=https://app.movearoundtms.com
   ```

3. **Start Server**
   ```bash
   cd /path/to/standalone
   node server.js
   ```

### File Management System Features

**Upload Capabilities:**
- Drag & drop interface
- Multiple file upload (up to 50MB per file)
- File type validation (images, PDFs, documents)
- Real-time progress indicators
- Automatic organization by company

**File Operations:**
- Secure viewing with signed URLs
- Access-controlled deletion
- Company-based file isolation
- Optimized listing with pagination
- Search and filter capabilities

**Security Features:**
- Row Level Security (RLS) enforcement
- Company-based access control
- Signed URL expiration (1 hour)
- File size and type validation
- Authentication required for all operations

### Next Steps for Production

1. **Update DNS Settings**
   - Point app.movearoundtms.com to your SiteGround server
   - Ensure HTTPS certificate is active

2. **Environment Variables**
   - Set production Supabase keys
   - Configure proper domain URLs
   - Test authentication flow

3. **Database Setup**
   - Verify company_assets_objects view exists
   - Test first_folder_segment() function
   - Confirm RLS policies are active

4. **Test Critical Paths**
   - Login/logout functionality
   - File upload/download
   - Company-specific data isolation
   - API endpoint responses

### Monitoring & Maintenance

- Monitor server.js process (consider PM2 for production)
- Watch Supabase usage and performance
- Regular backup of user data
- Monitor file storage usage

### Support & Troubleshooting

If you encounter issues:
1. Check server.js logs for errors
2. Verify environment variables are set
3. Test Supabase connection independently
4. Ensure all static files are properly copied

The application is now production-ready with a complete file management system, optimized database queries, and secure authentication flow.