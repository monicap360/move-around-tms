# 🌐 SiteGround Subdomain Deployment Guide

## 📋 **Subdomain Structure Overview**

```
Main Domain: movearoundtms.com (marketing/info site)
App Subdomain: movearoundtms.app (TMS application)
Partner Subdomains:
├── ronyx.movearoundtms.app (Veronica Butanda - ROnyx Logistics)
├── elite.movearoundtms.app (Maria Elizondo - Elite Transport)
├── meighoo.movearoundtms.app (Anil Meighoo - Meighoo Logistics)
└── garza.movearoundtms.app (Miram Garza - Garza Transport)
```

## 🏗️ **SiteGround Directory Structure**

### **Main App Directory: `/public_html/movearoundtms.app/`**

```
/public_html/movearoundtms.app/
├── admin-dashboard.html (Super Admin Portal)
├── assets/
│   └── theme-viable.css (Global Theme System)
├── auth/
│   └── index.html (Authentication Page)
├── admin/
│   ├── users.html
│   ├── settings.html
│   └── analytics.html
└── [Next.js static export files]
```

### **Partner Subdomains**

```
/public_html/ronyx.movearoundtms.app/
├── index.html (Partner Dashboard)
├── assets/ → symlink to ../movearoundtms.app/assets/
└── [partner-specific files]

/public_html/elite.movearoundtms.app/
├── index.html (Partner Dashboard)
├── assets/ → symlink to ../movearoundtms.app/assets/
└── [partner-specific files]

/public_html/meighoo.movearoundtms.app/
├── index.html (Partner Dashboard)
├── assets/ → symlink to ../movearoundtms.app/assets/
└── [partner-specific files]

/public_html/garza.movearoundtms.app/
├── index.html (Partner Dashboard)
├── assets/ → symlink to ../movearoundtms.app/assets/
└── [partner-specific files]
```

## 🔗 **Access URLs After DNS Propagation**

### **Super Admin Access**

- Monica: `https://movearoundtms.app/admin-dashboard.html?user=monica`
- Breanna: `https://movearoundtms.app/admin-dashboard.html?user=breanna`
- Shamsa: `https://movearoundtms.app/admin-dashboard.html?user=shamsa`
- Sylvia: `https://movearoundtms.app/admin-dashboard.html?user=sylvia`

### **Partner Portal Access**

- ROnyx (Veronica): `https://ronyx.movearoundtms.app/`
- Elite (Maria): `https://elite.movearoundtms.app/`
- Meighoo (Anil): `https://meighoo.movearoundtms.app/`
- Garza (Miram): `https://garza.movearoundtms.app/`

### **Authentication & System Access**

- Login Portal: `https://movearoundtms.app/auth/`
- User Management: `https://movearoundtms.app/admin/users.html`
- System Settings: `https://movearoundtms.app/admin/settings.html`
- Analytics: `https://movearoundtms.app/admin/analytics.html`

## ⚙️ **SiteGround cPanel Setup Steps**

### **1. Create Subdomains in cPanel**

```bash
# In SiteGround cPanel → Subdomains:
movearoundtms.app → /public_html/movearoundtms.app/
ronyx.movearoundtms.app → /public_html/ronyx.movearoundtms.app/
elite.movearoundtms.app → /public_html/elite.movearoundtms.app/
meighoo.movearoundtms.app → /public_html/meighoo.movearoundtms.app/
garza.movearoundtms.app → /public_html/garza.movearoundtms.app/
```

### **2. DNS Configuration**

```
# Already configured nameservers:
ns1.siteground.net
ns2.siteground.net

# SiteGround will auto-create A records for subdomains
```

### **3. SSL Certificates**

```bash
# SiteGround cPanel → SSL/TLS → Let's Encrypt:
- Enable for movearoundtms.app
- Enable for ronyx.movearoundtms.app
- Enable for elite.movearoundtms.app
- Enable for meighoo.movearoundtms.app
- Enable for garza.movearoundtms.app
```

## 📦 **Deployment Commands**

### **Build Static Export**

```bash
cd /app
npm run build
# Creates /out directory with static files
```

### **Upload to SiteGround**

```bash
# Main app files → /public_html/movearoundtms.app/
# Partner portals → respective subdomain folders
# Global assets → shared via symlinks
```

## 🔐 **Supabase Configuration**

```sql
-- Run in Supabase SQL Editor:
-- File: supabase/SUPER_ADMIN_FINAL.sql
-- Sets up Monica, Breanna, Shamsa, Sylvia as super_admins
-- Creates universal RLS bypass policies
```

## 🎨 **Theme System**

- **Global CSS:** `/assets/theme-viable.css`
- **Colors:** Navy header, electric blue highlights, orange CTAs
- **Font:** Inter for professional typography
- **Consistency:** All dashboards use same theme file

## 🚀 **Go-Live Checklist**

- [ ] DNS propagation complete (24-48 hours)
- [ ] All subdomains created in SiteGround cPanel
- [ ] SSL certificates enabled for all domains
- [ ] Static files uploaded to correct directories
- [ ] Asset symlinks created for partner portals
- [ ] Supabase SQL setup executed
- [ ] Admin dashboard personalization tested
- [ ] Partner portal access verified

## 🎯 **Benefits of Subdomain Architecture**

✅ **Clean URLs:** Each partner gets branded subdomain  
✅ **Easy Management:** Centralized theme and assets  
✅ **Scalability:** Simple to add new partners  
✅ **Professional:** Branded experience per partner  
✅ **SEO Friendly:** Separate domains for each entity  
✅ **No Vercel Issues:** Pure static hosting reliability
