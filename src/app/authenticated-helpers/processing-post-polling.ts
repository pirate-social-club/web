export const PROCESSING_POST_POLL_MAX_ELAPSED_MS = 15 * 60_000;
export const PROCESSING_POST_POLL_INITIAL_INTERVAL_MS = 4_000;
export const PROCESSING_POST_POLL_BACKOFF_INTERVAL_MS = 10_000;
export const PROCESSING_POST_POLL_SLOW_INTERVAL_MS = 30_000;

export function processingPostPollDelayMs(elapsedMs: number): number {
  if (elapsedMs < 60_000) {
    return PROCESSING_POST_POLL_INITIAL_INTERVAL_MS;
  }
  if (elapsedMs < 5 * 60_000) {
    return PROCESSING_POST_POLL_BACKOFF_INTERVAL_MS;
  }
  return PROCESSING_POST_POLL_SLOW_INTERVAL_MS;
}

export function shouldContinueProcessingPostPolling(elapsedMs: number): boolean {
  return elapsedMs < PROCESSING_POST_POLL_MAX_ELAPSED_MS;
}
