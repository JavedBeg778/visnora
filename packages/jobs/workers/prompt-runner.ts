// Visnora — M3 Background Job Worker (BullMQ Prompt Runner)
// Backward compatibility wrapper around tracking-worker.ts

export {
  processTrackingJob,
  startTrackingWorker as startPromptWorker,
  stopTrackingWorker,
  getTrackingWorkerHealth,
  type TrackingWorkerHealth,
} from './tracking-worker';

import { startTrackingWorker } from './tracking-worker';

// Auto-run if executed directly as entrypoint
if (typeof require !== 'undefined' && require.main === module && process.argv[1]?.includes('prompt-runner')) {
  startTrackingWorker();
}

