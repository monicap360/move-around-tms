# Safe Recovery Commands (Approved)

## ✅ Check System Status

```bash
# Memory usage
free -h

# Disk usage
df -h

# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx --no-pager

# Check application logs
pm2 logs move-around-tms --lines 50

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## ✅ Restart Application Safely

```bash
# Restart all PM2 processes
pm2 restart all

# Restart specific app
pm2 restart move-around-tms

# Check restart was successful
pm2 status
```

## ✅ Reload Nginx (No Config Change)

```bash
# Test configuration first
sudo nginx -t

# If test passes, reload (no downtime)
sudo systemctl reload nginx

# Verify reload successful
sudo systemctl status nginx
```

## ✅ Clear Temp Uploads ONLY

```bash
# Clear temporary upload directory (safe)
rm -rf /tmp/uploads/*

# Or application-specific temp directory
rm -rf /var/www/move-around-tms/temp-uploads/*

# Verify disk space freed
df -h
```

## ✅ Pause Background Jobs

```bash
# Stop background worker
pm2 stop background-worker

# Or stop all workers
pm2 stop all --only-workers

# Verify stopped
pm2 status
```

## ✅ Resume Background Jobs

```bash
# Start background worker
pm2 start background-worker

# Or start all workers
pm2 start all --only-workers

# Verify started
pm2 status
```

## ✅ Rate Limit Uploads (Temporary)

```bash
# This would be done via application configuration
# Or Nginx rate limiting rules
# See: /etc/nginx/sites-available/move-around-tms

# Example: Enable rate limiting in Nginx
# limit_req_zone $binary_remote_addr zone=uploads:10m rate=10r/s;
```

## 🚫 NEVER RUN

- `rm -rf /` - Destroys entire system
- Database migrations without backup
- Destructive deletes (customer data, logs, etc.)
- Schema changes without testing
- Force restarts without diagnosis
- `kill -9` on PM2 processes (use `pm2 restart`)
- Drop database tables
- Truncate production tables
- `git reset --hard` on production
- Any command that modifies customer data

## ⚠️ BEFORE RUNNING ANY COMMAND

1. **Check current system state**
   ```bash
   pm2 status
   df -h
   free -h
   ```

2. **Verify you're on the correct server**
   ```bash
   hostname
   pwd
   ```

3. **Check if incident exists in TMS**
   - Open `/company/[company]/ops/incidents`
   - Review auto-actions taken
   - Follow recommendations

4. **If uncertain, wait for Incident Response Agent recommendation**

## 📝 LOGGING

All recovery actions should be logged:
- Via Incident Response Agent (automatic)
- Or manually in incident record
- Include: command run, result, timestamp, operator
