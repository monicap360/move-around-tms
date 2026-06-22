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
    if (!dev) {
      // Disable persistent cache — Render's filesystem is ephemeral.
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
