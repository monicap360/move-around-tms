const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: `output: "standalone"` was REMOVED. Its file-tracer runs after compile
  // and scans the whole project tree — the prime suspect for the silent post-
  // compile build failure on Render (exit 1 right after "Skipping validation of
  // types", no error, while passing locally). The app starts with `next start`
  // (render.yaml startCommand: npm run start), which does NOT need standalone
  // output, and nothing references .next/standalone — so this is runtime-safe.

  // Serialize static generation into one process for reliable memory use.
  // On the Pro plan (4 GB) with NODE_OPTIONS=--max-old-space-size=3072 the build
  // fits with ~1 GB headroom (build floor verified ~1.5-3 GB). If page count /
  // deps grow and the build OOMs, bump the plan and the cap together.
  experimental: {
    // Build box is verified 133GB RAM / 32 CPUs — the old cpus:1 / workerThreads:false
    // serialization was tuned for a wrong "4GB Pro plan" assumption and is the prime
    // suspect for the single-worker silent crash on Linux during page-data collection.
    // Removed; keep only the webpack memory optimization.
    webpackMemoryOptimizations: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable Next's built-in image optimizer so the native `sharp` binary is never
  // loaded during the build. On Render's Linux the sharp variant can mismatch
  // (glibc vs musl) and segfault the build worker silently — the suspected cause
  // of the post-compile exit 1. Images are served as-is (no server-side resize).
  images: {
    unoptimized: true,
  },

  // Next 16 builds with Turbopack by default. We keep the `webpack` config below for
  // the `build:webpack` fallback, but Turbopack needs its own config block (even empty)
  // or it errors out. The `@/` alias resolves from tsconfig paths, so no extra config
  // is needed here. Node built-ins in client bundles are handled by Turbopack natively.
  turbopack: {},

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
