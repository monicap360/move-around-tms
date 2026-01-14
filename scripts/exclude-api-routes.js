// This script temporarily renames API routes to exclude them from static export
const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'app', 'api');
const excludeDir = path.join(process.cwd(), 'app', 'api.disabled');

function excludeApiRoutes() {
  if (!fs.existsSync(apiDir)) {
    console.log('No API directory found');
    return;
  }

  // Create disabled directory
  if (!fs.existsSync(excludeDir)) {
    fs.mkdirSync(excludeDir, { recursive: true });
  }

  // Move API routes
  const items = fs.readdirSync(apiDir);
  items.forEach(item => {
    const source = path.join(apiDir, item);
    const dest = path.join(excludeDir, item);
    
    if (fs.statSync(source).isDirectory()) {
      // Skip if already moved
      if (!fs.existsSync(dest)) {
        fs.renameSync(source, dest);
        console.log(`Moved: ${item}`);
      }
    }
  });
}

function restoreApiRoutes() {
  if (!fs.existsSync(excludeDir)) {
    return;
  }

  const items = fs.readdirSync(excludeDir);
  items.forEach(item => {
    const source = path.join(excludeDir, item);
    const dest = path.join(apiDir, item);
    
    if (fs.statSync(source).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.renameSync(source, dest);
        console.log(`Restored: ${item}`);
      }
    }
  });
}

const command = process.argv[2];
if (command === 'exclude') {
  excludeApiRoutes();
} else if (command === 'restore') {
  restoreApiRoutes();
} else {
  console.log('Usage: node scripts/exclude-api-routes.js [exclude|restore]');
}
