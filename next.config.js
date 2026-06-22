/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: [
    "exceljs",
    "archiver",
    "unzipper",
    "nodemailer",
    "tmp",
    "jszip",
  ],

  // Acknowledge Turbopack (default in Next.js 16).
  turbopack: {
    root: __dirname,
  },

  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Disable persistent cache — Render's filesystem is ephemeral so it
      // never survives between builds, and it's the biggest build-RAM consumer.
      config.cache = false;
    }
    if (!isServer) {
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

module.exports = nextConfig;
