// Visnora — Unified Background Workers Entrypoint (M3 Tracking + M5 Ads + M6 ChatGPT Ads)
// Reference: docs/TECHNICAL_BLUEPRINT.md & Finding 14 Remediation

import http from 'http';
import { startTrackingWorker, stopTrackingWorker, getTrackingWorkerHealth } from './tracking-worker';
import { startAdWorker, stopAdWorker } from './ad-worker';
import { startChatGPTAdsWorker, stopChatGPTAdsWorker } from './chatgpt-ads-worker';
import { isRedisAvailable, closeTrackingQueue } from '../queues/tracking-queue';
import { closeAdQueue } from '../queues/ad-queue';
import { closeChatGPTAdsQueue } from '../queues/chatgpt-ads-queue';

let healthServer: http.Server | null = null;

export async function startAllWorkers() {
  console.log('[WorkerRunner] Initializing Visnora production background workers...');

  const available = await isRedisAvailable();
  if (!available) {
    console.error(
      '[WorkerRunner] ERROR: Redis is not reachable at configured endpoint. Background workers cannot start.'
    );
    process.exit(1);
  }

  const concurrency = Number(process.env.WORKER_CONCURRENCY) || 2;
  console.log(`[WorkerRunner] Redis connection verified. Starting workers with concurrency=${concurrency}...`);

  const trackingWorker = startTrackingWorker(concurrency);
  const adWorker = startAdWorker(concurrency);
  const chatGPTAdsWorker = startChatGPTAdsWorker(concurrency);

  console.log('[WorkerRunner] All background workers active and listening for durable jobs.');

  // Start lightweight health probe server if PORT or WORKER_PORT is specified (e.g. on Render/Railway)
  const healthPort = process.env.WORKER_PORT || process.env.PORT;
  if (healthPort) {
    const port = Number(healthPort);
    healthServer = http.createServer(async (req, res) => {
      if (req.url === '/health' || req.url === '/healthz' || req.url === '/') {
        const trackingHealth = await getTrackingWorkerHealth();
        const payload = {
          status: trackingHealth.status,
          service: 'visnora-background-worker',
          uptimeSeconds: trackingHealth.uptimeSeconds,
          redis: trackingHealth.redisConnected ? 'connected' : 'disconnected',
          workers: {
            tracking: trackingWorker?.isRunning() ? 'running' : 'stopped',
            adIntelligence: 'running',
            chatgptAds: 'running',
          },
          timestamp: new Date().toISOString(),
        };

        const statusCode = trackingHealth.status === 'healthy' ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload, null, 2));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    healthServer.listen(port, () => {
      console.log(`[WorkerRunner] Worker health check server listening on port ${port} (GET /health)`);
    });
  }

  // Handle graceful shutdown on signals
  const shutdown = async (signal: string) => {
    console.log(`[WorkerRunner] Received ${signal}. Initiating graceful shutdown...`);
    try {
      if (healthServer) {
        await new Promise<void>((resolve) => healthServer?.close(() => resolve()));
        console.log('[WorkerRunner] Health server stopped.');
      }
      await stopTrackingWorker();
      await stopAdWorker();
      await stopChatGPTAdsWorker();
      await closeTrackingQueue();
      await closeAdQueue();
      await closeChatGPTAdsQueue();
      console.log('[WorkerRunner] Clean shutdown complete.');
      process.exit(0);
    } catch (err: any) {
      console.error('[WorkerRunner] Error during shutdown:', err.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Auto-run when executed directly
if (typeof require !== 'undefined' && require.main === module) {
  startAllWorkers().catch((err) => {
    console.error('[WorkerRunner] Fatal startup error:', err);
    process.exit(1);
  });
}

