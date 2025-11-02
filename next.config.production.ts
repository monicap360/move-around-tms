import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate a self-contained Node server in .next/standalone for hosting on Node environments (e.g., SiteGround)
  output: "standalone",
  // Disable Turbopack for production builds to avoid path resolution issues
  experimental: {
    turbo: false,
  },
};

export default nextConfig;