/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow Supabase storage images
  images: {
    domains: ["supabase.co"],
  },

  // Improve performance
  poweredByHeader: false,
  compress: true,
  generateEtags: true,

  // No redirects, no custom weird configs
};

export default nextConfig;

