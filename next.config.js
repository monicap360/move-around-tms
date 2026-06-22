/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverComponentsExternalPackages: [
      "exceljs",
      "archiver",
      "unzipper",
      "nodemailer",
      "tmp",
      "jszip",
    ],
  },

  webpack: (config, { isServer, dev }) => {
    if (!dev) {
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
