# Deployment Script - Quick Reference

## ✅ Pre-Deployment Checklist

- [x] All changes committed and pushed to main
- [ ] Build tested locally
- [ ] Environment variables ready
- [ ] Database migrations ready (if needed)

## 🚀 Deployment Steps

### 1. Local Build Test (Optional but Recommended)

```bash
npm run build
```

If build succeeds, proceed to deployment.

### 2. SSH into Droplet

```bash
ssh root@your-droplet-ip
# or
ssh user@your-droplet-ip
```

### 3. Navigate to Project Directory

```bash
cd /var/www/move-around-tms
# or wherever your project is located
cd ~/move-around-tms
```

### 4. Pull Latest Changes

```bash
git pull origin main
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Build Application

```bash
npm run build
```

### 7. Restart Server

**If using PM2:**
```bash
pm2 restart move-around-tms
# or
pm2 restart all
pm2 logs move-around-tms --lines 50
```

**If using systemd:**
```bash
sudo systemctl restart move-around-tms
sudo systemctl status move-around-tms
```

**If using direct Node:**
```bash
# Stop current process (Ctrl+C or kill)
pkill -f node
# Start new process
npm start
# or
NODE_ENV=production npm start
```

### 8. Verify Deployment

```bash
# Check if server is running
curl http://localhost:3000

# Check logs
pm2 logs
# or
journalctl -u move-around-tms -f
```

### 9. Test in Browser

Visit your domain:
- https://your-domain.com
- https://your-domain.com/dashboard
- https://your-domain.com/finance
- https://your-domain.com/invoices

## 🔧 Troubleshooting

### Build Fails
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### PM2 Issues
```bash
pm2 delete all
pm2 start npm --name "move-around-tms" -- start
pm2 save
pm2 startup
```

### Nginx 502 Error
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

## 📝 Environment Variables

Make sure these are set on your droplet:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

## ✅ Post-Deployment Checklist

- [ ] Site loads successfully
- [ ] Dashboard works
- [ ] No 502/404 errors
- [ ] Database connections work
- [ ] API routes respond
- [ ] All new pages accessible

---

**Ready to deploy!** Follow the steps above on your droplet.
