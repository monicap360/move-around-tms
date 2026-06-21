import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: __dirname,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // exceljs uses dynamic requires and doesn't bundle cleanly on Linux — keep it external
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
