import { describe, expect, test } from "bun:test";

import {
  PROCESSING_POST_POLL_BACKOFF_INTERVAL_MS,
  PROCESSING_POST_POLL_INITIAL_INTERVAL_MS,
  PROCESSING_POST_POLL_MAX_ELAPSED_MS,
  PROCESSING_POST_POLL_SLOW_INTERVAL_MS,
  processingPostPollDelayMs,
  shouldContinueProcessingPostPolling,
} from "./processing-post-polling";

describe("processing post polling", () => {
  test("uses fast polling for the first minute", () => {
    expect(processingPostPollDelayMs(0)).toBe(PROCESSING_POST_POLL_INITIAL_INTERVAL_MS);
    expect(processingPostPollDelayMs(59_999)).toBe(PROCESSING_POST_POLL_INITIAL_INTERVAL_MS);
  });

  test("backs off after the first minute and slows after five minutes", () => {
    expect(processingPostPollDelayMs(60_000)).toBe(PROCESSING_POST_POLL_BACKOFF_INTERVAL_MS);
    expect(processingPostPollDelayMs((5 * 60_000) - 1)).toBe(PROCESSING_POST_POLL_BACKOFF_INTERVAL_MS);
    expect(processingPostPollDelayMs(5 * 60_000)).toBe(PROCESSING_POST_POLL_SLOW_INTERVAL_MS);
  });

  test("caps polling after the maximum elapsed time", () => {
    expect(shouldContinueProcessingPostPolling(PROCESSING_POST_POLL_MAX_ELAPSED_MS - 1)).toBe(true);
    expect(shouldContinueProcessingPostPolling(PROCESSING_POST_POLL_MAX_ELAPSED_MS)).toBe(false);
  });
});
