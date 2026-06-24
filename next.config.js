const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),

  // Build-memory guard for the 512 MB Render Starter plan: run static generation
  // in a single process (no per-worker heap multiplication) instead of 5 workers.
  // Slower build, far lower peak RAM. Remove if the plan is upgraded to >=2 GB.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

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

  // Security headers applied to every response — replaces middleware header logic
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",              value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",        value: "nosniff" },
          { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy",       value: "upgrade-insecure-requests" },
          { key: "Strict-Transport-Security",     value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },

  // Redirect www.ronyx.* → ronyx.* — replaces middleware redirect logic
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.ronyx.movearoundtms.app" }],
        destination: "https://ronyx.movearoundtms.app/:path*",
        permanent: true,
      },
    ];
  },

  // Subdomain → path rewrites — replaces middleware rewrite logic
  // Each known carrier subdomain rewrites to its /slug/* path.
  async rewrites() {
    const carriers = ["ronyx", "solis", "garcia", "ymr", "leah", "jjalvarado"];

    const rules = carriers.flatMap((slug) => [
      // Bare "/" on subdomain → /slug
      {
        source: "/",
        has: [{ type: "host", value: `${slug}.movearoundtms.app` }],
        destination: `/${slug}`,
      },
      // Any other path on subdomain → /slug/:path*
      {
        source: "/:path*",
        has: [{ type: "host", value: `${slug}.movearoundtms.app` }],
        destination: `/${slug}/:path*`,
      },
    ]);

    return rules;
  },

  webpack: (config, { isServer, dev }) => {
    // Explicitly wire @/ → project root so Linux (Render) resolves it correctly.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

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
