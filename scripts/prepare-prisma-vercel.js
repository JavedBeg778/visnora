const fs = require('fs');
const path = require('path');

const rootPrisma = path.resolve(__dirname, '../node_modules/.prisma/client');
const webNodeModulesPrisma = path.resolve(__dirname, '../apps/web/node_modules/.prisma/client');
const webNextServer = path.resolve(__dirname, '../apps/web/.next/server');

const mode = process.argv[2]; // 'prebuild' or 'postbuild'

if (mode === 'prebuild') {
  if (fs.existsSync(rootPrisma)) {
    fs.mkdirSync(webNodeModulesPrisma, { recursive: true });
    fs.cpSync(rootPrisma, webNodeModulesPrisma, { recursive: true });
    console.log(`[prepare-prisma] Synced Prisma Client to ${webNodeModulesPrisma}`);
  } else {
    console.warn(`[prepare-prisma] Root Prisma directory not found: ${rootPrisma}`);
  }
} else if (mode === 'postbuild') {
  if (fs.existsSync(rootPrisma) && fs.existsSync(webNextServer)) {
    const files = fs.readdirSync(rootPrisma);
    for (const file of files) {
      if (file.includes('query_engine') || file.endsWith('.node')) {
        const src = path.join(rootPrisma, file);
        const dst = path.join(webNextServer, file);
        fs.copyFileSync(src, dst);
        console.log(`[prepare-prisma] Copied engine ${file} to ${webNextServer}`);
      }
    }
  }
}
