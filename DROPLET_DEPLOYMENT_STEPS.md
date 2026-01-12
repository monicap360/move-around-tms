# Droplet Deployment Steps

## ✅ Changes Committed & Pushed

All changes have been committed and pushed to the repository:
- Enterprise dashboard upgrade
- 502/404 error fixes
- Accounting integration UI
- Fuel management UI
- Finance page (404 fix)
- Invoices page (full functionality)
- All production-ready code

## 📋 Deploy to Droplet

### Step 1: SSH into Your Droplet

```bash
ssh root@your-droplet-ip
# or
ssh user@your-droplet-ip
```

### Step 2: Navigate to Project Directory

```bash
cd /path/to/move-around-tms
# Common paths:
# /var/www/move-around-tms
# /home/user/move-around-tms
# /root/move-around-tms
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
# or
git pull origin master
```

### Step 4: Install Dependencies (if package.json changed)

```bash
npm install
```

### Step 5: Build the Application (if needed)

```bash
npm run build
```

### Step 6: Restart Your Server

**If using PM2:**
```bash
pm2 restart move-around-tms
# or
pm2 restart all
```

**If using systemd:**
```bash
sudo systemctl restart move-around-tms
# or
sudo systemctl restart nginx
sudo systemctl restart node
```

**If using direct Node:**
```bash
# Stop current process (Ctrl+C or kill)
# Then restart:
npm start
# or
node server.js
```

### Step 7: Check Status

**PM2:**
```bash
pm2 status
pm2 logs move-around-tms
```

**Systemd:**
```bash
sudo systemctl status move-around-tms
```

**Check if site is running:**
```bash
curl http://localhost:3000
# or check your domain
curl https://your-domain.com
```

## 🔍 Quick Troubleshooting

### If git pull fails:
```bash
git stash
git pull
git stash pop
```

### If build fails:
```bash
rm -rf node_modules
rm -rf .next
npm install
npm run build
```

### If server won't start:
```bash
# Check logs
pm2 logs
# or
journalctl -u move-around-tms -f

# Check port
lsof -i :3000
netstat -tulpn | grep :3000
```

### If 502 errors persist:
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if Node is running
pm2 status
# or
ps aux | grep node
```

## ✅ Verify Deployment

1. Visit your domain: `https://your-domain.com`
2. Check dashboard: `https://your-domain.com/dashboard`
3. Check finance page: `https://your-domain.com/finance`
4. Check invoices: `https://your-domain.com/invoices`
5. Check accounting: `https://your-domain.com/accounting/integrations`
6. Check fuel: `https://your-domain.com/fuel`

## 📝 Notes

- Make sure your environment variables are set on the droplet
- Ensure database migrations are run if needed
- Check that Supabase connection is working
- Verify all API routes are accessible

---

**Status**: ✅ Code committed and pushed  
**Next**: Pull on droplet and restart server
