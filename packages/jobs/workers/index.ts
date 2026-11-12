// Visnora — Unified Background Workers Entrypoint (M3 Prompt Worker + M5 Ad Worker)
// Reference: docs/TECHNICAL_BLUEPRINT.md

import { startPromptWorker } from './prompt-runner';
import { startAdWorker, stopAdWorker } from './ad-worker';
import { startChatGPTAdsWorker, stopChatGPTAdsWorker } from './chatgpt-ads-worker';
import { isRedisAvailable, closeTrackingQueue } from '../queues/tracking-queue';
import { closeAdQueue } from '../queues/ad-queue';
import { closeChatGPTAdsQueue } from '../queues/chatgpt-ads-queue';

export async function startAllWorkers() {
  console.log('[WorkerRunner] Initializing Visnora background workers...');

  const available = await isRedisAvailable();
  if (!available) {
    console.error(
      '[WorkerRunner] ERROR: Redis is not reachable at configured endpoint. Background workers cannot start.'
    );
    process.exit(1);
  }

  console.log('[WorkerRunner] Redis connection verified. Starting workers...');

  const promptWorker = startPromptWorker(2);
  const adWorker = startAdWorker(2);
  const chatGPTAdsWorker = startChatGPTAdsWorker(2);

  console.log('[WorkerRunner] All background workers active and listening for jobs.');

  // Handle graceful shutdown on signals
  const shutdown = async (signal: string) => {
    console.log(`[WorkerRunner] Received ${signal}. Initiating graceful shutdown...`);
    try {
      if (promptWorker) await promptWorker.close();
      if (adWorker) await stopAdWorker();
      if (chatGPTAdsWorker) await stopChatGPTAdsWorker();
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

