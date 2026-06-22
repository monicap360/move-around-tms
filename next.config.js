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
      // Filesystem cache keeps compiled modules on disk instead of RAM.
      config.cache = {
        type: "filesystem",
        allowCollectingMemory: false,
      };
      // Limit parallel workers so peak RSS stays under Render's container limit.
      // Sequential compilation uses more wall-time but ~40% less peak memory.
      config.parallelism = 1;
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
