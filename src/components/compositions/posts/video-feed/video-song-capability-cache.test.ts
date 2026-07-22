import { describe, expect, mock, test } from "bun:test";

import { VideoSongCapabilityCache } from "./video-song-capability-cache";

describe("VideoSongCapabilityCache", () => {
  test("keys concurrent and out-of-order results by source post", async () => {
    const resolvers = new Map<string, (value: never) => void>();
    const load = mock((sourcePostId: string) => new Promise((resolve) => {
      resolvers.set(sourcePostId, resolve);
    }));
    const cache = new VideoSongCapabilityCache("viewer:1", load);
    const pending = cache.prefetch(["pst_first", "pst_second"]);

    resolvers.get("pst_second")?.({
      activeRewardOffer: false,
      karaoke: "ready",
      readMode: "public",
      sourcePostId: "pst_second",
      sourceCommunityId: "cmt_second",
      study: "unavailable",
      viewerIsAuthor: false,
    } as never);
    resolvers.get("pst_first")?.({
      activeRewardOffer: false,
      karaoke: "unavailable",
      readMode: "authenticated",
      sourcePostId: "pst_first",
      sourceCommunityId: "cmt_first",
      study: "ready",
      viewerIsAuthor: false,
    } as never);
    await pending;

    expect(cache.get("pst_first")).toMatchObject({ sourcePostId: "pst_first", study: "ready" });
    expect(cache.get("pst_second")).toMatchObject({ sourcePostId: "pst_second", karaoke: "ready" });
  });

  test("negative-caches a bounded failure for the viewer session", async () => {
    const load = mock(async () => { throw new Error("missing"); });
    const cache = new VideoSongCapabilityCache("viewer:1", load, 2);

    await cache.prefetch(["pst_missing"]);
    await cache.prefetch(["pst_missing"]);

    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.get("pst_missing")).toBeNull();
  });

  test("deduplicates the same source across adjacent slides", async () => {
    const load = mock(async (sourcePostId: string) => ({
      activeRewardOffer: false,
      karaoke: "ready" as const,
      readMode: "authenticated" as const,
      sourcePostId,
      sourceCommunityId: "cmt_song",
      study: "ready" as const,
      viewerIsAuthor: false,
    }));
    const cache = new VideoSongCapabilityCache("viewer:1", load);

    await cache.prefetch(["pst_song", "pst_song", "pst_song"]);

    expect(load).toHaveBeenCalledTimes(1);
  });
});
