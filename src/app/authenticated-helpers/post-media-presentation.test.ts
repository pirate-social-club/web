import { describe, expect, test } from "bun:test";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { toKaraokeCapability, toStudyCapability } from "./post-media-presentation";

function songPostWithPresentation(
  songPresentation: Record<string, unknown>,
  communityKaraokeEnabled = true,
): ApiPost {
  return {
    community: {
      karaoke_enabled: communityKaraokeEnabled,
    },
    post: {
      access_mode: "public",
      media_refs: [],
      post_type: "song",
    },
    song_presentation: songPresentation,
  } as unknown as ApiPost;
}

describe("toKaraokeCapability", () => {
  test("marks songs ready when completed alignment has inline timed lyrics and an instrumental", () => {
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "completed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
      timed_lyrics: {
        raw_lines: [
          {
            end_ms: 1000,
            start_ms: 0,
            text: "Sing this",
          },
        ],
      },
    }))).toEqual({ canKaraoke: true, status: "ready" });
  });

  test("marks songs ready when completed alignment has ref-backed timed lyrics and an instrumental", () => {
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "completed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
      timed_lyrics_ref: "r2://karaoke/song.json",
    }))).toEqual({ canKaraoke: true, status: "ready" });
  });

  test("surfaces processing and failed alignment states when an instrumental exists", () => {
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "pending",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toEqual({ canKaraoke: false, status: "processing" });
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "processing",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toEqual({ canKaraoke: false, status: "processing" });
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "failed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toEqual({ canKaraoke: false, status: "failed" });
  });

  test("does not expose karaoke capability without an instrumental", () => {
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "completed",
      timed_lyrics: {
        raw_lines: [{ end_ms: 1000, start_ms: 0, text: "No track" }],
      },
    }))).toBeUndefined();
  });

  test("does not expose karaoke capability when the community has not enabled karaoke", () => {
    expect(toKaraokeCapability(songPostWithPresentation({
      alignment_status: "completed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
      timed_lyrics: {
        raw_lines: [{ end_ms: 1000, start_ms: 0, text: "No gate" }],
      },
    }, false))).toBeUndefined();
  });
});

describe("toStudyCapability", () => {
  test("uses the server-derived study capability", () => {
    expect(toStudyCapability({
      ...songPostWithPresentation(null),
      study_capability: {
        status: "ready",
        exercise_count: 12,
        source_language: "en",
        target_language: "es",
      },
    })).toEqual({
      status: "ready",
      exerciseCount: 12,
      sourceLanguage: "en",
      targetLanguage: "es",
    });
  });

  test("does not infer study availability from timed lyrics", () => {
    expect(toStudyCapability(songPostWithPresentation({
      timed_lyrics: {
        raw_lines: [
          {
            end_ms: 1000,
            start_ms: 0,
            text: "Study this",
          },
        ],
      },
    }))).toBeUndefined();
  });
});
