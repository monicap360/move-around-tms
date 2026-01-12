#!/bin/bash

# 502 Error Diagnostic Script for MoveAround TMS
# Run this on your droplet to identify 502 error causes

echo "=========================================="
echo "  502 Error Diagnostic Script"
echo "  MoveAround TMS - Production Server"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track issues found
ISSUES=0
WARNINGS=0

echo -e "${BLUE}=== 1. PM2 Status Check ===${NC}"
echo ""
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 status 2>&1)
    echo "$PM2_STATUS"
    
    if echo "$PM2_STATUS" | grep -q "move-around-tms"; then
        if echo "$PM2_STATUS" | grep -q "online"; then
            echo -e "${GREEN}✓ PM2 process is running${NC}"
        else
            echo -e "${RED}✗ PM2 process exists but is NOT online${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "${RED}✗ PM2 process 'move-around-tms' not found${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}✗ PM2 not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

echo -e "${BLUE}=== 2. Application Directory Check ===${NC}"
echo ""
APP_DIR="/var/www/move-around-tms"
if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}✓ Application directory exists: $APP_DIR${NC}"
    cd "$APP_DIR" || exit 1
    
    # Check if .next exists (build directory)
    if [ -d ".next" ]; then
        echo -e "${GREEN}✓ Build directory (.next) exists${NC}"
    else
        echo -e "${YELLOW}⚠ Build directory (.next) not found - may need to run 'npm run build'${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check package.json
    if [ -f "package.json" ]; then
        echo -e "${GREEN}✓ package.json exists${NC}"
    else
        echo -e "${RED}✗ package.json not found${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}✗ Application directory not found: $APP_DIR${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

echo -e "${BLUE}=== 3. Environment Variables Check ===${NC}"
echo ""
ENV_FILE="$APP_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓ .env.production file exists${NC}"
    
    # Check critical variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE"; then
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "" ]; then
            echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL is set${NC}"
        else
            echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL is empty${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not found${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$ENV_FILE"; then
        SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ -n "$SERVICE_KEY" ] && [ ${#SERVICE_KEY} -gt 50 ]; then
            echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY is set (length: ${#SERVICE_KEY})${NC}"
        else
            echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY is missing or too short${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY not found${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ENV_FILE"; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set${NC}"
    else
        echo -e "${YELLOW}⚠ NEXT_PUBLIC_SUPABASE_ANON_KEY not found (may be optional)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ .env.production file not found${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

echo -e "${BLUE}=== 4. Port Availability Check ===${NC}"
echo ""
PORT=3000
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep ":$PORT " || ss -tlnp 2>/dev/null | grep ":$PORT ")
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${GREEN}✓ Port $PORT is in use:${NC}"
        echo "$PORT_CHECK"
    else
        echo -e "${RED}✗ Port $PORT is NOT in use - server may not be running${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠ Cannot check port (netstat/ss not available)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo -e "${BLUE}=== 5. Health Endpoint Test ===${NC}"
echo ""
HEALTH_URL="http://localhost:3000/api/health"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Health endpoint responding (HTTP $HTTP_CODE)${NC}"
        RESPONSE=$(curl -s "$HEALTH_URL" 2>/dev/null)
        echo "Response: $RESPONSE"
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}✗ Health endpoint not reachable (connection refused)${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${YELLOW}⚠ Health endpoint returned HTTP $HTTP_CODE${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠ curl not available - cannot test health endpoint${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo -e "${BLUE}=== 6. Nginx/Proxy Configuration Check ===${NC}"
echo ""
if [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/default"
    if grep -q "proxy_pass.*3000" "$NGINX_CONFIG"; then
        echo -e "${GREEN}✓ Nginx configured to proxy to port 3000${NC}"
        PROXY_LINE=$(grep "proxy_pass.*3000" "$NGINX_CONFIG")
        echo "  Found: $PROXY_LINE"
    else
        echo -e "${YELLOW}⚠ Nginx proxy_pass to port 3000 not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check if nginx is running
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx service is running${NC}"
    else
        echo -e "${RED}✗ Nginx service is NOT running${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠ Nginx config not found (may be using different proxy)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo -e "${BLUE}=== 7. Recent PM2 Logs (Last 20 Lines) ===${NC}"
echo ""
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "move-around-tms"; then
        echo -e "${BLUE}PM2 Logs:${NC}"
        pm2 logs move-around-tms --lines 20 --nostream 2>/dev/null || echo "Could not retrieve logs"
    else
        echo -e "${YELLOW}⚠ PM2 process not found - cannot retrieve logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ PM2 not available${NC}"
fi
echo ""

echo -e "${BLUE}=== 8. Node.js and npm Check ===${NC}"
echo ""
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

echo -e "${BLUE}=== 9. Disk Space Check ===${NC}"
echo ""
DISK_USAGE=$(df -h "$APP_DIR" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ]; then
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✓ Disk usage: ${DISK_USAGE}%${NC}"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        echo -e "${YELLOW}⚠ Disk usage: ${DISK_USAGE}% (getting full)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${RED}✗ Disk usage: ${DISK_USAGE}% (CRITICAL)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠ Could not check disk usage${NC}"
fi
echo ""

echo -e "${BLUE}=== 10. Memory Check ===${NC}"
echo ""
if command -v free &> /dev/null; then
    MEMORY_INFO=$(free -h | grep Mem)
    MEMORY_USED=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    echo "Memory: $MEMORY_INFO"
    if [ "$MEMORY_USED" -lt 90 ]; then
        echo -e "${GREEN}✓ Memory usage: ${MEMORY_USED}%${NC}"
    else
        echo -e "${RED}✗ Memory usage: ${MEMORY_USED}% (CRITICAL)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠ Could not check memory${NC}"
fi
echo ""

echo "=========================================="
echo -e "${BLUE}=== SUMMARY ===${NC}"
echo "=========================================="
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ No issues found!${NC}"
    echo "The server appears to be configured correctly."
    echo ""
    echo "If you're still experiencing 502 errors, check:"
    echo "  1. External firewall rules"
    echo "  2. DNS configuration"
    echo "  3. SSL certificate issues"
    echo "  4. Application-specific errors in PM2 logs"
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠ Found $WARNINGS warning(s) but no critical issues${NC}"
    echo "Server should be functional, but review warnings above."
else
    echo -e "${RED}✗ Found $ISSUES critical issue(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "RECOMMENDED FIXES:"
    echo ""
    
    if ! pm2 list | grep -q "move-around-tms.*online"; then
        echo "1. Start/Restart PM2:"
        echo "   cd $APP_DIR"
        echo "   pm2 restart move-around-tms"
        echo "   # OR if not running:"
        echo "   pm2 start npm --name move-around-tms -- start"
        echo ""
    fi
    
    if [ ! -f "$ENV_FILE" ] || ! grep -q "SUPABASE_SERVICE_ROLE_KEY" "$ENV_FILE"; then
        echo "2. Set up environment variables:"
        echo "   cd $APP_DIR"
        echo "   nano .env.production"
        echo "   # Add: NEXT_PUBLIC_SUPABASE_URL=..."
        echo "   # Add: SUPABASE_SERVICE_ROLE_KEY=..."
        echo ""
    fi
    
    if ! netstat -tlnp 2>/dev/null | grep -q ":3000" && ! ss -tlnp 2>/dev/null | grep -q ":3000"; then
        echo "3. Build and start the application:"
        echo "   cd $APP_DIR"
        echo "   npm install"
        echo "   npm run build"
        echo "   pm2 restart move-around-tms"
        echo ""
    fi
fi

echo ""
echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="
