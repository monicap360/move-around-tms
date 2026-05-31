/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  basePath: "",
  trailingSlash: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  pageExtensions: ["ts", "tsx", "js", "jsx"],

  // Reduce webpack memory footprint during production builds
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      config.cache = false;
    }
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wqeidcatuwqtzwhvmqfr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZWlkY2F0dXdxdHp3aHZtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjkxNzcsImV4cCI6MjA3Njk0NTE3N30.E8bSplLakPK0obSoyhddRt64V8rFXS7ZMlaIQQaI0TQ",
    NEXT_PUBLIC_SITE_URL: "https://movearoundtms.com",
    NEXT_PUBLIC_PARTNER_SUBDOMAIN: "movearoundtms.com",
  },
};

module.exports = nextConfig;
