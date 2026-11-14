const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@prisma/client'],
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**/*': [
      '../../node_modules/.prisma/client/**/*',
      './node_modules/.prisma/client/**/*',
    ],
    '/*': [
      '../../node_modules/.prisma/client/**/*',
      './node_modules/.prisma/client/**/*',
    ],
  },
  serverExternalPackages: ['bullmq', 'ioredis'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@valkey/valkey-glide'];
    }
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

