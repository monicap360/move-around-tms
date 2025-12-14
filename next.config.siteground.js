/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export configuration for SiteGround
  output: 'export',
  
  // Required for static export
  images: {
    unoptimized: true
  },
  
  // Ensure trailing slashes for static hosting
  trailingSlash: true,
  
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Environment variables (embedded at build time)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://wqeidcatuwqtzwhvmqfr.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ',
  },

  // Disable server-side features
  experimental: {
    serverActions: false,
  }
  // Asset prefix for CDN (if needed)
  assetPrefix: '',
>>>>>>> e53244d ( SITEGROUND DEPLOYMENT SOLUTIONS - Complete File Guides)
}

module.exports = nextConfig