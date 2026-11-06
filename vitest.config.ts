import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, 'apps/web/app'),
      '@/components': path.resolve(__dirname, 'apps/web/components'),
      '@/lib': path.resolve(__dirname, 'apps/web/lib'),
      '@/styles': path.resolve(__dirname, 'apps/web/styles'),
      '@/database': path.resolve(__dirname, 'packages/database'),
      '@/domain': path.resolve(__dirname, 'packages/domain'),
      '@/integrations': path.resolve(__dirname, 'packages/integrations'),
      '@/jobs': path.resolve(__dirname, 'packages/jobs'),
      '@/shared': path.resolve(__dirname, 'packages/shared'),
    },
  },
});

