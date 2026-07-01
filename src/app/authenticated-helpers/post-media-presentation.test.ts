import { describe, expect, test } from "bun:test";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { toKaraokeCapability, toStudyCapability } from "./post-media-presentation";

function songPost(opts: {
  instrumental?: boolean;
  alignmentStatus?: "pending" | "processing" | "completed" | "failed" | null;
  communityKaraokeEnabled?: boolean;
  hasTimedLyrics?: boolean | null;
} = {}): ApiPost {
  const {
    instrumental = true,
    alignmentStatus = "completed",
    communityKaraokeEnabled = true,
    hasTimedLyrics = true,
  } = opts;
  return {
    community: {
      karaoke_enabled: communityKaraokeEnabled,
    },
    post: {
      access_mode: "public",
      media_refs: [],
      post_type: "song",
    },
    song_presentation: {
      title: "Test Song",
      cover_art_ref: null,
      duration_ms: null,
      alignment_status: alignmentStatus,
      has_timed_lyrics: hasTimedLyrics,
      downloadable_audio: instrumental
        ? [{ kind: "instrumental", storage_ref: "/instrumental.mp3", mime_type: "audio/mpeg" }]
        : [],
    },
  } as unknown as ApiPost;
}

describe("toKaraokeCapability", () => {
  test("marks a community-enabled song with an instrumental as ready", () => {
    expect(toKaraokeCapability(songPost())).toEqual({ canKaraoke: true, status: "ready" });
  });

  test("waits while karaoke alignment is still processing", () => {
    expect(toKaraokeCapability(songPost({ alignmentStatus: "processing" }))).toEqual({
      canKaraoke: false,
      status: "processing",
    });
  });

  test("marks failed karaoke alignment as failed", () => {
    expect(toKaraokeCapability(songPost({ alignmentStatus: "failed" }))).toEqual({
      canKaraoke: false,
      status: "failed",
    });
  });

  test("does not mark completed alignment ready without timed lyrics", () => {
    expect(toKaraokeCapability(songPost({ hasTimedLyrics: false }))).toEqual({
      canKaraoke: false,
      status: "unavailable",
    });
  });

  test("returns undefined when the community has not enabled karaoke", () => {
    expect(toKaraokeCapability(songPost({ communityKaraokeEnabled: false }))).toBeUndefined();
  });

  test("returns undefined when no instrumental audio is present", () => {
    expect(toKaraokeCapability(songPost({ instrumental: false }))).toBeUndefined();
  });

  test("returns undefined when song_presentation is absent", () => {
    const post: ApiPost = {
      community: { karaoke_enabled: true },
      post: { post_type: "song", access_mode: "public", media_refs: [] },
      song_presentation: null,
    } as unknown as ApiPost;
    expect(toKaraokeCapability(post)).toBeUndefined();
  });

  test("returns undefined when community is absent", () => {
    const post: ApiPost = {
      post: { post_type: "song", access_mode: "public", media_refs: [] },
      song_presentation: {
        title: null, cover_art_ref: null, duration_ms: null,
        alignment_status: "completed",
        has_timed_lyrics: true,
        downloadable_audio: [{ kind: "instrumental", storage_ref: "/i.mp3", mime_type: "audio/mpeg" }],
      },
    } as unknown as ApiPost;
    expect(toKaraokeCapability(post)).toBeUndefined();
  });
});

describe("toStudyCapability", () => {
  test("uses the server-derived study capability", () => {
    expect(toStudyCapability({
      ...songPost(),
      study_capability: {
        status: "ready",
        exercise_count: 12,
        source_language: "en",
        target_language: "es",
      },
    } as unknown as ApiPost)).toEqual({
      status: "ready",
      exerciseCount: 12,
      sourceLanguage: "en",
      targetLanguage: "es",
    });
  });

  test("returns undefined when the server omits a study capability", () => {
    expect(toStudyCapability(songPost())).toBeUndefined();
  });

  test("does not infer study availability from timed lyrics alone", () => {
    expect(toStudyCapability(songPost({ hasTimedLyrics: true }))).toBeUndefined();
  });

  test("returns undefined for non-song posts", () => {
    expect(toStudyCapability({
      post: { post_type: "video", access_mode: "public", media_refs: [] },
      study_capability: { status: "ready" },
    } as unknown as ApiPost)).toBeUndefined();
  });
});
