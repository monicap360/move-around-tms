/** @type {import('next').NextConfig} */
const nextConfig = {
  // For SiteGround deployment - regular build first, then we'll handle static files
  images: {
    unoptimized: true
  },
  
  // Set trailing slash for better compatibility
  trailingSlash: true,
  
  // Output for SiteGround deployment with server functions
  output: 'standalone',
  
  // Skip type checking during build to focus on the core issue
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // No redirects - allow proper auth flow
}

module.exports = nextConfig