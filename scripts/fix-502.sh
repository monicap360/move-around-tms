#!/bin/bash

# Quick Fix Script for 502 Errors
# This script attempts to automatically fix common 502 issues

echo "=========================================="
echo "  502 Error Quick Fix Script"
echo "  MoveAround TMS - Production Server"
echo "=========================================="
echo ""

APP_DIR="/var/www/move-around-tms"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠ This script may need sudo privileges for some operations"
    echo ""
fi

echo "Step 1: Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    cd "$APP_DIR" || exit 1
    
    if pm2 list | grep -q "move-around-tms"; then
        echo "✓ PM2 process found, restarting..."
        pm2 restart move-around-tms
        sleep 2
        
        if pm2 list | grep -q "move-around-tms.*online"; then
            echo "✓ PM2 process restarted successfully"
        else
            echo "✗ PM2 process failed to start"
            echo "Attempting to start from scratch..."
            pm2 delete move-around-tms 2>/dev/null
            pm2 start npm --name move-around-tms -- start
        fi
    else
        echo "✗ PM2 process not found, starting..."
        pm2 start npm --name move-around-tms -- start
    fi
    
    echo ""
    echo "PM2 Status:"
    pm2 status
else
    echo "✗ PM2 not installed"
    echo "Install with: npm install -g pm2"
fi

echo ""
echo "Step 2: Checking environment variables..."
if [ -f "$APP_DIR/.env.production" ]; then
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$APP_DIR/.env.production"; then
        echo "✓ Environment variables file exists"
    else
        echo "⚠ Environment variables may be missing"
        echo "Please check $APP_DIR/.env.production"
    fi
else
    echo "✗ .env.production file not found"
    echo "Please create it with required variables"
fi

echo ""
echo "Step 3: Testing health endpoint..."
sleep 3  # Wait for server to start
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Health endpoint responding (HTTP $HTTP_CODE)"
    else
        echo "✗ Health endpoint returned HTTP $HTTP_CODE"
        echo "Check PM2 logs: pm2 logs move-around-tms"
    fi
else
    echo "⚠ curl not available - cannot test endpoint"
fi

echo ""
echo "Step 4: Checking Nginx..."
if [ -f "/etc/nginx/sites-available/default" ]; then
    if systemctl is-active --quiet nginx; then
        echo "✓ Nginx is running"
        echo "Reloading Nginx configuration..."
        sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || echo "⚠ Could not reload nginx (may need sudo)"
    else
        echo "✗ Nginx is not running"
        echo "Starting Nginx..."
        sudo systemctl start nginx 2>/dev/null || echo "⚠ Could not start nginx (may need sudo)"
    fi
fi

echo ""
echo "=========================================="
echo "Fix attempt complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check PM2 logs: pm2 logs move-around-tms"
echo "2. Test the application in browser"
echo "3. If still having issues, run: ./diagnose-502.sh"
