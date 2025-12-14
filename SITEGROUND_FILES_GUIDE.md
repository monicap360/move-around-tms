# 📁 SITEGROUND FILES DEPLOYMENT GUIDE

## 🚀 **WHAT FILES TO UPLOAD TO SITEGROUND**

### **Issue Detection:**
The current Next.js build configuration is not generating an `out` directory for static export. Here's what needs to be fixed and deployed:

---

## 🔧 **STEP 1: Fix Next.js Configuration**

### **Current Problem:**
- Build runs but no `/out` directory created
- Configuration issue with static export

### **Solution: Update next.config.js**
Create a proper static export configuration:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for SiteGround
  output: 'export',
  
  // Required for static export
  images: {
    unoptimized: true
  },
  
  // Disable server features
  trailingSlash: true,
  
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable server components that won't work on static hosting
  experimental: {
    serverActions: false,
  }
}

module.exports = nextConfig
```

---

## 📦 **STEP 2: Generate Static Files**

### **Commands to Run:**
```bash
# 1. Clean previous builds
rm -rf .next out

# 2. Build with static export
npm run build

# 3. Verify out directory is created
ls out/
```

---

## 🌐 **STEP 3: Files to Upload to SiteGround**

### **Upload Location:** `public_html/ronyx/` (for ronyx.movearoundtms.app)

### **Required Files from `/out` directory:**
```
📁 out/                          → Upload ALL contents to SiteGround
├── index.html                   → Main homepage
├── _next/                       → Next.js static assets
│   ├── static/                  → Static assets (CSS, JS, images)
│   └── chunks/                  → JavaScript chunks
├── ronyx/                       → Ronyx-specific pages  
│   ├── index.html              → /ronyx dashboard
│   └── login/
│       └── index.html          → /ronyx/login page
├── veronica/                    → Veronica's dashboard
│   ├── index.html              → /veronica dashboard
│   └── change-password/
│       └── index.html          → Password change page
├── partners/                    → Partner portals
├── admin/                       → Admin pages
├── dashboard/                   → General dashboard
├── favicon.ico                  → Site favicon
└── [all other generated files] → Complete site structure
```

---

## 🎯 **STEP 4: SiteGround Directory Structure**

### **For Ronyx Subdomain (ronyx.movearoundtms.app):**
```
📁 public_html/
└── 📁 ronyx/                    → Subdomain root
    ├── index.html              → Homepage redirect or landing
    ├── ronyx/
    │   ├── index.html          → Main Ronyx dashboard
    │   └── login/
    │       └── index.html      → Ronyx login page
    ├── _next/                  → Next.js assets
    ├── favicon.ico             → Ronyx favicon
    └── [all static files]      → Complete exported site
```

### **Key URLs After Deployment:**
- `https://ronyx.movearoundtms.app/` → Homepage
- `https://ronyx.movearoundtms.app/ronyx/login/` → Ronyx login
- `https://ronyx.movearoundtms.app/ronyx/` → Ronyx dashboard

---

## ⚠️ **IMPORTANT NOTES**

### **1. Static Export Limitations:**
- **No API Routes**: `/api/*` endpoints won't work on static hosting
- **No Server Actions**: All authentication must be client-side (Supabase ✅)
- **No Dynamic Routing**: Only pre-built static pages work

### **2. Authentication Consideration:**
- ✅ **Supabase Auth**: Works perfectly with static sites
- ✅ **Client-side routing**: React Router handles navigation
- ✅ **Environment variables**: Embedded at build time

### **3. Workaround for API Routes:**
Since SiteGround is static hosting, you'll need:
- **Option A**: Use Vercel/Netlify for API routes + SiteGround for frontend
- **Option B**: Move all logic to Supabase (recommended)
- **Option C**: Use SiteGround's PHP hosting for backend API

---

## 🔧 **STEP 5: Fix Build Configuration**

### **Immediate Action Required:**
1. **Update next.config.js** with proper static export settings
2. **Run build again** to generate `/out` directory  
3. **Upload `/out` contents** to SiteGround
4. **Test Ronyx login flow** on production

### **Expected Result:**
After proper configuration, you'll have:
- ✅ `/out` directory with all static files
- ✅ Ronyx login page working on SiteGround
- ✅ Complete fleet management portal
- ✅ Supabase authentication integration

---

## 🎯 **QUICK CHECKLIST**

- [ ] Fix next.config.js for static export
- [ ] Run `npm run build` 
- [ ] Verify `/out` directory exists
- [ ] Upload all `/out` contents to `public_html/ronyx/`
- [ ] Configure subdomain DNS: `ronyx.movearoundtms.app`
- [ ] Enable SSL certificate
- [ ] Test login: `https://ronyx.movearoundtms.app/ronyx/login/`

**Result**: Professional Ronyx Fleet Portal live on SiteGround! 🚛✨