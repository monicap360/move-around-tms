/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for Digital Ocean deployment
  images: {
    unoptimized: false,
    domains: ['wqeidcatuwqtzwhvmqfr.supabase.co']
  },
  
  trailingSlash: false,
  
  // Enable type checking for better error detection
  typescript: {
    ignoreBuildErrors: false,
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

    return config;
  },

  // Standard settings for Node.js deployment
  experimental: {
    // Enable concurrent features for faster builds
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Optimize CSS handling
    optimizeCss: true,
  },
  
  // Build optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // No redirects - allow proper auth flow
}

export default nextConfig;
