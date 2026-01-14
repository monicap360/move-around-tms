# 502 Bad Gateway Troubleshooting Guide

## Quick Checks

### 1. Is the Server Running?

**Check if Node.js process is running:**
```bash
# If using PM2
pm2 status
pm2 logs move-around-tms --lines 50

# If using systemd
sudo systemctl status move-around-tms
journalctl -u move-around-tms -f

# Check if Node is running at all
ps aux | grep node
```

### 2. Check Server Logs

**Next.js server logs:**
```bash
# PM2 logs
pm2 logs move-around-tms --lines 100

# Systemd logs
sudo journalctl -u move-around-tms -n 100 -f

# Direct Node process
# Check where your npm start or node server.js is running
```

### 3. Test Health Endpoints

Try these URLs to see if the server responds:
- `https://ronyx.movearoundms.com/api/health`
- `https://ronyx.movearoundms.com/health`
- `https://ronyx.movearoundms.com/ronyx/login`

If these work but other routes don't, it's a routing issue.
If none work, the server isn't running or crashed.

### 4. Environment Variables

**Verify environment variables are set on the server:**
```bash
# Check .env file exists
ls -la .env.production
cat .env.production

# Verify variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

**Required variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)

### 5. Port Configuration

**Check if port 3000 (or your configured port) is accessible:**
```bash
# Check if port is in use
lsof -i :3000
netstat -tulpn | grep :3000

# Test local connection
curl http://localhost:3000/api/health
```

### 6. Reverse Proxy Configuration

**If using Nginx, check configuration:**
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

**Nginx should proxy to:**
```
proxy_pass http://localhost:3000;
```

### 7. SiteGround Specific Issues

**If deploying to SiteGround:**

1. **Check if Node.js is enabled:**
   - SiteGround cPanel → Node.js Selector
   - Verify Node.js version (should be >= 18.17.0)
   - Check if application is started

2. **Check Application Manager:**
   - SiteGround cPanel → Application Manager
   - Verify your app is listed and running
   - Check logs in Application Manager

3. **Static Export Option:**
   If SiteGround doesn't support Node.js well, you may need to:
   ```bash
   npm run build
   npm run export  # Creates /out directory
   ```
   Then upload `/out` directory to `public_html/ronyx`

### 8. Restart the Server

**Try restarting everything:**
```bash
# PM2
pm2 restart all
pm2 save

# Systemd
sudo systemctl restart move-around-tms
sudo systemctl restart nginx

# Direct Node
pkill -f node
npm start
```

## Common Fixes

### Fix 1: Server Not Started
```bash
cd /path/to/move-around-tms
npm install
npm run build
npm start
# or
pm2 start npm --name "move-around-tms" -- start
```

### Fix 2: Missing Environment Variables
Create `.env.production` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wqeidcatuwqtzwhvmqfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SITE_URL=https://ronyx.movearoundms.com
```

### Fix 3: Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Or change port in package.json or .env
PORT=3001 npm start
```

### Fix 4: Build Issues
```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build
```

## Still Not Working?

1. **Check browser console** - Look for specific error messages
2. **Check network tab** - See exact HTTP status codes
3. **Try direct IP access** - Bypass DNS to test server directly
4. **Check firewall** - Ensure ports 80/443/3000 are open
5. **Contact hosting support** - SiteGround/your hosting provider

## Health Check Endpoints

These endpoints should always work if the server is running:
- `/api/health` - Returns JSON status
- `/health` - Returns HTML status page
- `/ronyx/login` - Should load login page

If these fail, the server isn't running or crashed.
