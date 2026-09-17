import { stageLogger } from "../logger.js";
import { markProcessing, markQueued } from "./jobStore.js";

const log = stageLogger("job-queue");

/**
 * Caps how many render pipelines (transcription-wait + the actual headless-Chrome
 * render) run at once. Each render is CPU/RAM-heavy, so on a modest VPS running
 * more than one or two at a time can starve them all rather than speed anything up.
 * Extra requests wait in FIFO order instead of running immediately.
 */
const MAX_CONCURRENT_RENDERS = Math.max(1, Number(process.env.MAX_CONCURRENT_RENDERS ?? 1));

let runningCount = 0;
const waiting: { jobId: string; run: () => Promise<void> }[] = [];

function updateQueuePositions() {
  waiting.forEach((entry, i) => markQueued(entry.jobId, i + 1));
}

function drain() {
  while (runningCount < MAX_CONCURRENT_RENDERS && waiting.length > 0) {
    const entry = waiting.shift()!;
    updateQueuePositions();
    runningCount++;
    markProcessing(entry.jobId);
    log.info({ jobId: entry.jobId, running: runningCount, waiting: waiting.length }, "starting queued job");
    entry
      .run()
      .catch((err) => log.error({ jobId: entry.jobId, err }, "queued task rejected unexpectedly"))
      .finally(() => {
        runningCount--;
        drain();
      });
  }
}

/** Enqueues a render task. `run` must itself handle recording success/failure on the job. */
export function enqueueRenderTask(jobId: string, run: () => Promise<void>): void {
  waiting.push({ jobId, run });
  updateQueuePositions();
  drain();
}

export function queueStats() {
  return { running: runningCount, waiting: waiting.length, maxConcurrentRenders: MAX_CONCURRENT_RENDERS };
}
