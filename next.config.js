const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@prisma/client'],
  outputFileTracingRoot: path.resolve(__dirname, '.'),
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/.prisma/client/**/*',
    ],
    '/*': [
      './node_modules/.prisma/client/**/*',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/app': path.resolve(__dirname, 'apps/web/app'),
      '@/components': path.resolve(__dirname, 'apps/web/components'),
      '@/lib': path.resolve(__dirname, 'apps/web/lib'),
      '@/styles': path.resolve(__dirname, 'apps/web/styles'),
      '@/database': path.resolve(__dirname, 'packages/database'),
      '@/domain': path.resolve(__dirname, 'packages/domain'),
      '@/integrations': path.resolve(__dirname, 'packages/integrations'),
      '@/jobs': path.resolve(__dirname, 'packages/jobs'),
      '@/shared': path.resolve(__dirname, 'packages/shared'),
    };
    return config;
  },
};

module.exports = nextConfig;


