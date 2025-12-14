# 📋 SITEGROUND DEPLOYMENT - CRITICAL FILES NEEDED

## ❌ **CURRENT ISSUE IDENTIFIED**

### **Problem**: API Routes Block Static Export
- `/api/*` endpoints cannot be statically exported to SiteGround
- Static hosting doesn't support server-side API routes
- Build fails because of dynamic API endpoints

### **Solution**: Two Deployment Options

---

## 🎯 **OPTION 1: RONYX-ONLY STATIC DEPLOYMENT (RECOMMENDED)**

### **What Works on SiteGround Static Hosting:**
- ✅ **Ronyx Login**: `/ronyx/login/` 
- ✅ **Ronyx Dashboard**: `/ronyx/`
- ✅ **Supabase Authentication**: Client-side auth works perfectly
- ✅ **Static Pages**: All React components and styling
- ✅ **Frontend Assets**: CSS, JS, images, fonts

### **Files Needed for Ronyx Portal Only:**
```
📁 Upload to public_html/ronyx/
├── 📁 ronyx/
│   ├── index.html              → /ronyx dashboard 
│   └── 📁 login/
│       └── index.html          → /ronyx/login page
├── 📁 _next/
│   ├── static/                 → CSS, JS assets
│   └── chunks/                 → React chunks
├── 📁 veronica/
│   ├── index.html              → /veronica dashboard
│   └── change-password/
├── index.html                  → Homepage
├── favicon.ico                 → Site icon
└── [other static assets]      → Images, fonts, etc.
```

### **Manual Build Process:**
```bash
# 1. Temporarily remove API routes for static build
Move-Item api api-backup

# 2. Build static export
npm run build

# 3. Upload /out directory contents to SiteGround  
# 4. Restore API routes for development
Move-Item api-backup api
```

---

## 🎯 **OPTION 2: HYBRID DEPLOYMENT**

### **Split Architecture:**
- **SiteGround**: Frontend only (Ronyx portal, dashboards)
- **Vercel/Netlify**: API routes and server functions
- **Connection**: Frontend calls external API endpoints

### **Files for SiteGround (Frontend Only):**
- Same as Option 1 but with API calls pointing to external URLs

---

## 🚀 **RECOMMENDED: QUICK RONYX DEPLOYMENT**

### **Immediate Steps for Ronyx Portal:**

1. **Backup API Routes**:
   ```bash
   Move-Item app/api app/api-backup
   ```

2. **Build Static Export**:
   ```bash
   npm run build
   ls out/  # Verify files created
   ```

3. **Upload to SiteGround**:
   - **Location**: `public_html/ronyx/`
   - **Files**: ALL contents of `/out` directory
   - **Result**: `https://ronyx.movearoundtms.app/ronyx/login/`

4. **Restore for Development**:
   ```bash
   Move-Item app/api-backup app/api
   ```

---

## ✅ **EXPECTED SITEGROUND FILE STRUCTURE**

### **After Upload (`public_html/ronyx/`):**
```
📁 ronyx.movearoundtms.app/
├── index.html                  → Landing page
├── 📁 ronyx/  
│   ├── index.html             → Ronyx dashboard (✅ Works)
│   └── 📁 login/
│       └── index.html         → Ronyx login (✅ Works)  
├── 📁 _next/
│   ├── 📁 static/             → CSS/JS assets (✅ Works)
│   └── 📁 chunks/             → React chunks (✅ Works)
├── 📁 veronica/               → Veronica's dashboard (✅ Works)
├── favicon.ico                → Icon (✅ Works)
└── [static assets]            → All working perfectly
```

---

## 🎯 **CRITICAL SUCCESS FACTORS**

### **What WILL Work on SiteGround:**
- ✅ Ronyx login page with professional branding
- ✅ Ronyx fleet dashboard with orange theme
- ✅ Supabase authentication (client-side)
- ✅ All React components and interactions
- ✅ Responsive design and styling

### **What WON'T Work (No Server):**
- ❌ `/api/*` endpoints (server-side functions)
- ❌ Server-side rendering features
- ❌ Dynamic API calls to local backend

### **Workaround for Missing APIs:**
- **Use Supabase Functions**: Replace API routes with Supabase edge functions
- **Client-side Logic**: Move server logic to React components
- **External APIs**: Use third-party services for complex operations

---

## 🚀 **FINAL ANSWER: FILES FOR SITEGROUND**

### **Essential Files (After Static Build):**
1. **ALL contents** of `/out` directory (created after `npm run build`)
2. **Upload location**: `public_html/ronyx/` on SiteGround
3. **Key files**: `ronyx/login/index.html`, `ronyx/index.html`, `_next/static/*`
4. **Result**: Working Ronyx Fleet Portal at `https://ronyx.movearoundtms.app/ronyx/login/`

**Bottom Line**: Remove API routes temporarily, build static export, upload everything from `/out` folder! 🎯