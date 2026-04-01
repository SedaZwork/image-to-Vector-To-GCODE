/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Turbopack optimization
  turbopack: {},

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Only in production builds
    if (!dev && !isServer) {
      // Bundle analyzer (uncomment to analyze bundle)
      // config.plugins.push(
      //   new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
      //     analyzerMode: 'static',
      //     openAnalyzer: false,
      //   })
      // );

      // Optimize chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Separate chunk for vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
          },
          // Separate chunk for UI components
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            enforce: true,
          },
          // Separate chunk for halftone components
          halftone: {
            test: /[\\/]src[\\/]components[\\/]halftone[\\/]/,
            name: 'halftone-components',
            chunks: 'all',
            enforce: true,
          },
          // Separate chunk for workers and heavy libs
          workers: {
            test: /[\\/]src[\\/](workers|lib)[\\/]/,
            name: 'workers-and-libs',
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    // Add support for web workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/js/[name].[contenthash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Compression
  compress: true,

  // PWA and offline support (optional)
  // Enable if you want the app to work offline
  // swcMinify: true,

  // Bundle size optimizations
  // Already handled by experimental.optimizePackageImports

  // Performance monitoring
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;