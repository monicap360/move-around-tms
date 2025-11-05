/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Vercel deployment optimization
  images: {
    unoptimized: false,
    domains: ['wqeidcatuwqtzwhvmqfr.supabase.co']
  },
  
  // Remove trailing slash for Vercel
  trailingSlash: false,
  
  // Standard output for Vercel
  // output: 'standalone', // Remove this for Vercel deployment
  
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
      },
    },
  },
  
  // Build optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // No redirects - allow proper auth flow
}

export default nextConfig;