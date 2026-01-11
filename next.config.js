/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build output: use 'standalone' so dynamic routes can render at runtime during builds.
  // This avoids the need for generateStaticParams() for every dynamic route.
  output: "standalone",

  // Required for static export
  images: {
    unoptimized: true,
  },

  // Set base path and asset prefix if needed
  basePath: "",

  // Ensure trailing slashes for static hosting when exporting
  trailingSlash: true,

  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Environment variables (embedded at build time)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wqeidcatuwqtzwhvmqfr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ",
    // SiteGround subdomain configuration
    NEXT_PUBLIC_SITE_URL: "https://movearoundtms.app",
    NEXT_PUBLIC_PARTNER_SUBDOMAIN: "movearoundtms.app",
  },
};

module.exports = nextConfig;
