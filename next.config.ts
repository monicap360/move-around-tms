import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: __dirname,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // These packages use dynamic requires / Node internals that webpack can't bundle on Linux
  serverExternalPackages: [
    "exceljs",
    "archiver",
    "unzipper",
    "nodemailer",
    "tmp",
    "jszip",
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to bundle server-only packages on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
