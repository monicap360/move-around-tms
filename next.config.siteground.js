/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for SiteGround (no Node.js server needed)
  output: "export",

  // Required for static export
  images: {
    unoptimized: true,
  },

  // Set base path and asset prefix if needed
  basePath: "",

  // Ensure trailing slashes for static hosting
  trailingSlash: true,

  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Exclude API routes and dynamic routes from static export
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Exclude problematic routes from build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  // Environment variables (embedded at build time)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wqeidcatuwqtzwhvmqfr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ",
    NEXT_PUBLIC_SITE_URL: "https://ronyx.movearoundms.com",
  },

  // Disable server-side features that won't work with static export
  experimental: {
    serverActions: false,
  },
};

module.exports = nextConfig;
