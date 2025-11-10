/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🏗️ SITEGROUND STATIC EXPORT - NO SERVER FUNCTIONS
  output: 'export',
  
  // Required for static export
  images: {
    unoptimized: true
  },
  
  // Disable server features
  trailingSlash: true,
  
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig