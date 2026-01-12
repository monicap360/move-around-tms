# Droplet 502 Error Diagnostic Guide

## Quick Start

### Option 1: Run Diagnostic Script (Recommended)
```bash
# SSH to your droplet
ssh user@your-droplet-ip

# Navigate to project directory
cd /var/www/move-around-tms

# Download or create the diagnostic script
# (Script is in scripts/diagnose-502.sh)

# Make it executable
chmod +x scripts/diagnose-502.sh

# Run diagnostic
./scripts/diagnose-502.sh
```

### Option 2: Quick Fix Script
```bash
# Run the quick fix script
chmod +x scripts/fix-502.sh
./scripts/fix-502.sh
```

---

## Manual Diagnostic Steps

### 1. Check PM2 Status
```bash
pm2 status
pm2 logs move-around-tms --lines 50
```

**Expected**: Should show `move-around-tms` with status `online`

**If not running**:
```bash
cd /var/www/move-around-tms
pm2 restart move-around-tms
# OR if it doesn't exist:
pm2 start npm --name move-around-tms -- start
```

### 2. Check Environment Variables
```bash
cd /var/www/move-around-tms
cat .env.production | grep SUPABASE
```

**Required variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional)

**If missing**, create/update `.env.production`:
```bash
nano .env.production
```

### 3. Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

**Expected**: Should return `{"status":"ok"}` or similar

**If connection refused**:
- Server not running on port 3000
- Check PM2 status
- Check if port is in use: `netstat -tlnp | grep 3000`

### 4. Check Port Availability
```bash
netstat -tlnp | grep 3000
# OR
ss -tlnp | grep 3000
```

**Expected**: Should show process listening on port 3000

### 5. Check Nginx Configuration
```bash
sudo nginx -t
cat /etc/nginx/sites-available/default | grep proxy_pass
```

**Expected**: Should show `proxy_pass http://localhost:3000;`

**If wrong**, update nginx config:
```bash
sudo nano /etc/nginx/sites-available/default
# Ensure proxy_pass points to http://localhost:3000
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Check Server Logs
```bash
# PM2 logs
pm2 logs move-around-tms --lines 100

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### 7. Check Disk Space
```bash
df -h
```

**If disk is full**:
```bash
# Clean npm cache
npm cache clean --force

# Remove old builds
rm -rf .next

# Rebuild
npm run build
```

### 8. Check Memory
```bash
free -h
```

**If memory is low**:
- Restart PM2: `pm2 restart move-around-tms`
- Restart server if needed
- Consider upgrading droplet

---

## Common Fixes

### Fix 1: PM2 Not Running
```bash
cd /var/www/move-around-tms
pm2 restart move-around-tms
# OR
pm2 delete move-around-tms
pm2 start npm --name move-around-tms -- start
pm2 save
pm2 startup  # Set up auto-start on boot
```

### Fix 2: Missing Environment Variables
```bash
cd /var/www/move-around-tms
nano .env.production

# Add:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Restart PM2
pm2 restart move-around-tms
```

### Fix 3: Build Errors
```bash
cd /var/www/move-around-tms
git pull origin main
npm install
npm run build
pm2 restart move-around-tms
```

### Fix 4: Nginx Misconfiguration
```bash
sudo nano /etc/nginx/sites-available/default

# Ensure this exists in location block:
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Fix 5: Port Conflict
```bash
# Check what's using port 3000
sudo lsof -i :3000
# OR
sudo netstat -tlnp | grep 3000

# Kill process if needed (replace PID)
sudo kill -9 <PID>

# Restart PM2
pm2 restart move-around-tms
```

---

## Diagnostic Script Output

The diagnostic script checks:
1. ✅ PM2 status
2. ✅ Application directory
3. ✅ Environment variables
4. ✅ Port availability
5. ✅ Health endpoint
6. ✅ Nginx configuration
7. ✅ PM2 logs
8. ✅ Node.js/npm versions
9. ✅ Disk space
10. ✅ Memory usage

---

## Troubleshooting Flow

```
502 Error
    ↓
Run diagnostic script
    ↓
Check PM2 status
    ├─ Not running → Start PM2
    └─ Running → Check logs
        ↓
Check environment variables
    ├─ Missing → Add to .env.production
    └─ Present → Check health endpoint
        ↓
Check health endpoint
    ├─ Not responding → Check port/PM2
    └─ Responding → Check Nginx
        ↓
Check Nginx
    ├─ Wrong config → Fix proxy_pass
    └─ Correct → Check external access
```

---

## Prevention

### Set Up Auto-Restart
```bash
pm2 startup
pm2 save
```

### Monitor PM2
```bash
pm2 monit
```

### Set Up Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Check Monitoring
Set up a cron job or monitoring service to check:
```bash
curl http://localhost:3000/api/health
```

---

## Support

If issues persist after running diagnostics:
1. Check PM2 logs: `pm2 logs move-around-tms`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `journalctl -xe`
4. Review diagnostic script output
5. Check application-specific errors in code

---

**Last Updated**: January 2025
