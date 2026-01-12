# Droplet Deployment Steps - Fix 502 Bad Gateway

## ✅ Changes Committed and Pushed

**Commit**: `22e3e04`  
**Branch**: `sidebar-syntax-0140d`  
**Status**: ✅ Pushed to GitHub

---

## Steps to Fix 502 Bad Gateway on Your Droplet

### 1. SSH into Your Droplet
```bash
ssh root@your-droplet-ip
# or
ssh user@your-droplet-ip
```

### 2. Navigate to Your Project Directory
```bash
cd /var/www/move-around-tms
# or wherever your project is located
```

### 3. Pull the Latest Changes
```bash
git pull origin sidebar-syntax-0140d
# or if you're on a different branch:
git fetch origin
git checkout sidebar-syntax-0140d
git pull origin sidebar-syntax-0140d
```

### 4. Install Dependencies (if needed)
```bash
npm install
# or
npm ci
```

### 5. Build the Application
```bash
npm run build
# or
next build
```

### 6. Restart the Server/Service

**Option A: If using PM2**
```bash
pm2 restart all
# or restart specific process:
pm2 restart move-around-tms
pm2 list  # Check status
pm2 logs  # Check logs
```

**Option B: If using systemd**
```bash
systemctl restart nextjs
# or
systemctl restart move-around-tms
systemctl status nextjs  # Check status
journalctl -u nextjs -f  # Check logs
```

**Option C: If running manually**
```bash
# Kill existing process
pkill -f next
# or find and kill:
ps aux | grep next
kill <PID>

# Start new process (in background or screen/tmux)
npm start
# or
next start
```

**Option D: If using Nginx + Node**
```bash
# Restart Nginx (if reverse proxy)
systemctl restart nginx

# Then restart Node service
pm2 restart all
# or
systemctl restart nodejs
```

### 7. Check Logs for Errors
```bash
# PM2 logs
pm2 logs

# Systemd logs
journalctl -u nextjs -f

# Nginx logs (if using reverse proxy)
tail -f /var/log/nginx/error.log

# Application logs
tail -f logs/error.log
# or check your log directory
```

### 8. Verify the Build Worked
```bash
# Check if build directory exists and has content
ls -la .next/
ls -la out/  # if static export

# Check if server is running
curl http://localhost:3000
# or whatever port your app uses
```

---

## Common 502 Bad Gateway Causes & Solutions

### 1. Build Errors
**Symptom**: Build fails during `npm run build`  
**Solution**: 
- Check build output for errors
- Fix any TypeScript/compilation errors
- Make sure all dependencies are installed

### 2. Server Not Running
**Symptom**: Process crashed or not started  
**Solution**:
- Restart the service (PM2/systemd)
- Check if port is in use: `netstat -tulpn | grep 3000`
- Check if process is running: `ps aux | grep next`

### 3. Out of Memory
**Symptom**: Process killed by OOM killer  
**Solution**:
- Check memory: `free -h`
- Increase swap space if needed
- Consider upgrading droplet memory
- Check logs for OOM errors: `dmesg | grep -i oom`

### 4. Port Not Available
**Symptom**: Port already in use or firewall blocking  
**Solution**:
- Check port usage: `lsof -i :3000`
- Kill conflicting process if needed
- Check firewall: `ufw status`
- Check Nginx config if using reverse proxy

### 5. Nginx Configuration Issues
**Symptom**: Nginx can't connect to Node.js backend  
**Solution**:
- Check Nginx config: `nginx -t`
- Verify upstream server in Nginx config points to correct port
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`
- Restart Nginx: `systemctl restart nginx`

### 6. File Permissions
**Symptom**: Can't read files or execute  
**Solution**:
```bash
# Fix ownership
chown -R www-data:www-data /var/www/move-around-tms
# or
chown -R $USER:$USER /var/www/move-around-tms

# Fix permissions
chmod -R 755 /var/www/move-around-tms
```

---

## Quick Diagnostic Commands

```bash
# Check if Node.js is running
ps aux | grep node

# Check port usage
netstat -tulpn | grep 3000

# Check system resources
free -h
df -h
top

# Check service status (if using systemd)
systemctl status nextjs

# Check PM2 status
pm2 status
pm2 logs

# Test local connection
curl http://localhost:3000
curl http://127.0.0.1:3000

# Check Nginx status (if using)
systemctl status nginx
nginx -t
```

---

## After Fixing 502 Error

1. **Verify the site loads**: Visit your domain in a browser
2. **Check for runtime errors**: Look for console errors or API errors
3. **Monitor logs**: Keep an eye on logs for a few minutes
4. **Test key features**: Make sure critical features still work

---

## Need More Help?

If 502 persists after these steps:
1. Check the specific error in logs
2. Verify all environment variables are set
3. Check database connections
4. Verify Supabase connection is working
5. Check if there are any missing dependencies

The build errors have been fixed, so the application should compile successfully now.
