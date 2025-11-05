import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Vercel deployment optimization
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wqeidcatuwqtzwhvmqfr.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Remove trailing slash for Vercel
  trailingSlash: false,
  
  // Enable type checking for better error detection
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Performance optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Webpack optimizations for faster builds
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Enable parallel processing
    config.parallelism = 100;
    
    // Optimize chunk splitting for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
          },
        },
      };
    }

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
      },
    },
  },
  
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
