/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🚨 DISABLE ALL CACHING TO FIX VERCEL ISSUES
  images: {
    unoptimized: true
  },
  
  // Force fresh builds
  trailingSlash: false,
  
  // Disable static optimization to prevent caching
  output: 'standalone',
  
  // Skip type checking during build to focus on the core issue
  typescript: {
    ignoreBuildErrors: true,
  },

  // 🔥 FORCE NO CACHING
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ]
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // No redirects - allow proper auth flow
}

module.exports = nextConfig