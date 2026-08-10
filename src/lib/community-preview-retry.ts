import { ApiError } from "@/lib/api/client";

const RETRY_DELAYS_MS = [250, 750] as const;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export async function loadCommunityPreviewWithRetry<T>(
  load: () => Promise<T>,
  wait: (delayMs: number) => Promise<void> = sleep,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      const delayMs = RETRY_DELAYS_MS[attempt];
      if (!(error instanceof ApiError) || error.retryable !== true || delayMs === undefined) {
        throw error;
      }
      await wait(delayMs);
    }
  }
}
