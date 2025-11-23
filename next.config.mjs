// next.config.mjs
// Next.js core configuration file.

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: true },
  images: { domains: ["supabase.co"] },
};

export default nextConfig;
<<<<<<< HEAD
/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Vercel deployment optimization
// next.config.mjs
// Core Next.js configuration.

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: true },
  images: { domains: ["supabase.co"] },
};

export default nextConfig;
    }

<<<<<<< HEAD
    return config;
  },

  // Vercel-optimized settings
  experimental: {
    // Enable server actions
    serverActions: true,
    // Enable concurrent features for faster builds
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Optimize CSS handling
    optimizeCss: true,
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.tsx': ['@vercel/next/typescript-transform'],
        '*.ts': ['@vercel/next/typescript-transform'],
=======
    // Enable turbo mode for faster compilation
    config.mode = dev ? 'development' : 'production';
    
    // Optimize memory usage
    config.optimization.minimize = !dev;
    
    // Ensure path alias '@' resolves to the app directory so imports like '@/components/..' work
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(process.cwd(), 'app'),
    };
    
    return config;
  },

  // Server external packages
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Experimental features for performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-progress'],
    
    // Memory optimizations
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
      },
    },
  },
  
<<<<<<< HEAD
  // Build optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // No redirects - allow proper auth flow
}

export default nextConfig;
=======
  // Optimize build output
  poweredByHeader: false,
  generateEtags: false,
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
// Force fresh deployment - 11/04/2025 18:32:28

// Vercel deployment trigger - 2025-11-04 18:54:41

// Author fix commit - 2025-11-05
// trigger vercel build - 2025-11-05

>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
