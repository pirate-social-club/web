import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/client";
import { loadCommunityPreviewWithRetry } from "./community-preview-retry";

describe("loadCommunityPreviewWithRetry", () => {
  test("retries an explicitly retryable preview failure with bounded backoff", async () => {
    const delays: number[] = [];
    let attempts = 0;

    const result = await loadCommunityPreviewWithRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new ApiError("community_preview_unavailable", "temporarily unavailable", 503, true);
      }
      return { id: "com_cmt_retry" };
    }, async (delayMs) => {
      delays.push(delayMs);
    });

    expect(result).toEqual({ id: "com_cmt_retry" });
    expect(attempts).toBe(3);
    expect(delays).toEqual([250, 750]);
  });

  test("does not retry terminal failures", async () => {
    let attempts = 0;

    await expect(loadCommunityPreviewWithRetry(async () => {
      attempts += 1;
      throw new ApiError("community_not_found", "not found", 404, false);
    }, async () => undefined)).rejects.toMatchObject({
      code: "community_not_found",
      status: 404,
    });

    expect(attempts).toBe(1);
  });
});
