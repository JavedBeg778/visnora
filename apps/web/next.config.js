const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@prisma/client'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/app': path.resolve(__dirname, 'app'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/styles': path.resolve(__dirname, 'styles'),
      '@/database': path.resolve(__dirname, '../../packages/database'),
      '@/domain': path.resolve(__dirname, '../../packages/domain'),
      '@/integrations': path.resolve(__dirname, '../../packages/integrations'),
      '@/jobs': path.resolve(__dirname, '../../packages/jobs'),
      '@/shared': path.resolve(__dirname, '../../packages/shared'),
    };
    return config;
  },
};

module.exports = nextConfig;

