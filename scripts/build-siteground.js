const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Backup current next.config.js
const currentConfig = path.join(process.cwd(), 'next.config.js');
const sitegroundConfig = path.join(process.cwd(), 'next.config.siteground.js');
const backupConfig = path.join(process.cwd(), 'next.config.js.backup');

console.log('📦 Building for SiteGround static export...\n');

try {
  // Backup current config
  if (fs.existsSync(currentConfig)) {
    fs.copyFileSync(currentConfig, backupConfig);
    console.log('✅ Backed up next.config.js');
  }

  // Copy siteground config
  if (fs.existsSync(sitegroundConfig)) {
    fs.copyFileSync(sitegroundConfig, currentConfig);
    console.log('✅ Using SiteGround config\n');
  } else {
    console.error('❌ next.config.siteground.js not found!');
    process.exit(1);
  }

  // Temporarily exclude API routes (they can't be statically exported)
  console.log('📦 Temporarily excluding API routes...\n');
  execSync('node scripts/exclude-api-routes.js exclude', { stdio: 'inherit' });

  // Clean previous builds
  const outDir = path.join(process.cwd(), 'out');
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log('🧹 Cleaned previous build\n');
  }

  // Build
  console.log('🔨 Building static export...\n');
  execSync('npm run build', { stdio: 'inherit' });

  // Restore API routes
  console.log('\n📦 Restoring API routes...\n');
  execSync('node scripts/exclude-api-routes.js restore', { stdio: 'inherit' });

  // Restore original config
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, currentConfig);
    fs.unlinkSync(backupConfig);
    console.log('✅ Restored original next.config.js');
  }

  // Check if out directory exists
  if (fs.existsSync(outDir)) {
    console.log('\n✅ Build complete! Static files in /out directory');
    console.log('📤 Upload contents of /out to SiteGround public_html/ronyx/');
    console.log('\n⚠️  Note: API routes are disabled in static export');
    console.log('   Use Supabase client-side functions or external API service');
  } else {
    console.error('\n❌ Build failed - /out directory not created');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  
  // Restore API routes on error
  try {
    execSync('node scripts/exclude-api-routes.js restore', { stdio: 'inherit' });
  } catch (e) {
    // Ignore restore errors
  }
  
  // Restore original config on error
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, currentConfig);
    fs.unlinkSync(backupConfig);
    console.log('✅ Restored original next.config.js');
  }
  
  process.exit(1);
}
