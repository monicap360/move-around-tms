#!/bin/bash
set -euo pipefail

echo "🚀 Deploying Ronyx MoveAroundTMS..."

git add .
git commit -m "Deploy $(date)"
git push origin main

echo "✅ Code pushed to GitHub"

echo "🖥️  Updating Digital Ocean Droplet..."
ssh root@your-droplet-ip << 'EOF'
  cd /opt/ronyx
  git pull origin main
  docker-compose down
  docker-compose build --no-cache
  docker-compose up -d
  echo "✅ Droplet updated"
EOF

echo "☁️  Triggering Render.com deployment..."
curl -X POST https://api.render.com/v1/services/[service-id]/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json"

echo "🎉 Deployment complete!"
echo "🌐 Web: https://ronyx-web.onrender.com"
echo "🔗 API: https://ronyx-api.onrender.com"
echo "🗄️  Database: your-droplet-ip:5432"
