import { describe, expect, test } from "bun:test";

import { __videoPosterFrameTestHooks, dataUrlToBlob } from "./video-poster-frame";

describe("dataUrlToBlob", () => {
  test("decodes a base64 image data URL without fetch", async () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,AQIDBA==", "image/jpeg");

    expect(blob.type).toBe("image/jpeg");
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });

  test("decodes a URL-encoded data URL", async () => {
    const blob = dataUrlToBlob("data:text/plain,hello%20poster", "text/plain");

    expect(blob.type).toStartWith("text/plain");
    expect(await blob.text()).toBe("hello poster");
  });
});

describe("video poster frame extraction", () => {
  test("keeps automatic candidate extraction bounded", () => {
    expect(__videoPosterFrameTestHooks.candidateSeconds(120, 0)).toEqual([0, 0.5, 1, 12]);
    expect(__videoPosterFrameTestHooks.candidateSeconds(120, 4.2)).toEqual([4.2]);
  });

  test("uses bounded media event waits", () => {
    expect(__videoPosterFrameTestHooks.VIDEO_POSTER_LOADED_DATA_TIMEOUT_MS).toBeLessThanOrEqual(3_000);
    expect(__videoPosterFrameTestHooks.VIDEO_POSTER_EVENT_TIMEOUT_MS).toBeLessThanOrEqual(8_000);
  });
});
