/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for SiteGround deployment
  output: "export",

  // Images configuration for static export
  images: {
    unoptimized: true,
  },

  // Set trailing slash for better compatibility
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
};

module.exports = nextConfig;
