import { describe, expect, test } from "bun:test";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import {
  extractRawLines,
  karaokeUnavailableMessage,
  normalizeApiKaraokePayload,
  toPlayableArtifactAudioUrl,
  toPlayableAudioUrl,
} from "./karaoke-route.helpers";

function songPostWithPresentation(songPresentation: Record<string, unknown>): LocalizedPostResponse {
  return {
    post: {
      post_type: "song",
      song_title: "Test Song",
      title: "Test Post",
    },
    song_presentation: songPresentation,
  } as unknown as LocalizedPostResponse;
}

function postWithType(postType: string): LocalizedPostResponse {
  return {
    post: {
      post_type: postType,
      title: "Not a song",
    },
    song_presentation: null,
  } as unknown as LocalizedPostResponse;
}

describe("karaoke route helpers", () => {
  test("unwraps raw line containers inside arrays", () => {
    const lines = extractRawLines({
      raw_lines: [
        {
          raw_lines: [
            {
              end_ms: 1200,
              start_ms: 0,
              text: "First line",
            },
          ],
        },
      ],
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("First line");
  });

  test("unwraps raw line containers nested inside records", () => {
    const lines = extractRawLines({
      raw_lines: {
        lines: [
          {
            end_ms: 1800,
            start_ms: 400,
            text: "Nested record line",
          },
        ],
      },
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("Nested record line");
  });

  test("does not treat arbitrary array wrapper objects as raw lines", () => {
    const lines = extractRawLines([
      { id: "wrapper-only", raw_lines: [] },
      { id: "metadata-only" },
      { end_ms: 2400, start_ms: 1300, text: "Actual line" },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("Actual line");
  });

  test("accepts http audio urls and api-relative audio paths only", () => {
    expect(toPlayableAudioUrl("https://cdn.example.test/song.mp3")).toBe("https://cdn.example.test/song.mp3");
    expect(toPlayableAudioUrl("filebase://songs/audio.mp3")).toBeUndefined();
    expect(toPlayableAudioUrl("ipfs://bafybeisong/audio.mp3")).toBeUndefined();
    expect(toPlayableAudioUrl("/public-communities/cmt/song.mp3")).toContain("/public-communities/cmt/song.mp3");
  });

  test("uses decentralized gateway urls when storage refs are not directly playable", () => {
    expect(toPlayableArtifactAudioUrl({
      decentralized_storage: {
        gateway_url: "https://dweb.link/ipfs/bafybeisong/audio.mp3",
      },
      storage_ref: "filebase://songs/audio.mp3",
    })).toBe("https://dweb.link/ipfs/bafybeisong/audio.mp3");
  });

  test("prefers directly playable storage refs over gateway urls", () => {
    expect(toPlayableArtifactAudioUrl({
      decentralized_storage: {
        gateway_url: "https://dweb.link/ipfs/bafybeisong/audio.mp3",
      },
      storage_ref: "https://cdn.example.test/instrumental.mp3",
    })).toBe("https://cdn.example.test/instrumental.mp3");
  });

  test("does not produce browser audio urls for decentralized refs without a gateway", () => {
    expect(toPlayableArtifactAudioUrl({
      storage_ref: "ipfs://bafybeisong/audio.mp3",
    })).toBeUndefined();
  });

  test("prefers API karaoke_lines over legacy raw_lines", () => {
    const payload = normalizeApiKaraokePayload({
      id: "sab_test",
      instrumental_audio_url: "https://cdn.example.test/instrumental.mp3",
      karaoke_lines: [
        { end_ms: 1000, id: "line-0", index: 0, kind: "lyric", start_ms: 0, text: "New line", words: [] },
      ],
      object: "song_karaoke_payload",
      raw_lines: [
        { end_ms: 1000, start_ms: 0, text: "Legacy line" },
      ],
      title: "API Karaoke",
    }, songPostWithPresentation({
      title: "Fallback title",
    }));

    expect(payload?.rawLines.map((line) => line.text)).toEqual(["New line"]);
  });

  test("explains unavailable karaoke states", () => {
    expect(karaokeUnavailableMessage(postWithType("text"))).toBe("This post is not a song.");
    expect(karaokeUnavailableMessage(songPostWithPresentation({
      alignment_status: "completed",
    }))).toBe("This song does not have an instrumental track for karaoke.");
    expect(karaokeUnavailableMessage(songPostWithPresentation({
      alignment_status: "completed",
      instrumental_audio: {
        storage_ref: "filebase://songs/audio.mp3",
      },
      timed_lyrics: {
        raw_lines: [{ end_ms: 1000, start_ms: 0, text: "Line" }],
      },
    }))).toBe("This song's instrumental track cannot be played in the browser yet.");
    expect(karaokeUnavailableMessage(songPostWithPresentation({
      alignment_status: "processing",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toBe("Karaoke lyrics are still processing.");
    expect(karaokeUnavailableMessage(songPostWithPresentation({
      alignment_status: "failed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toBe("Karaoke lyrics could not be prepared for this song.");
    expect(karaokeUnavailableMessage(songPostWithPresentation({
      alignment_status: "completed",
      instrumental_audio: {
        storage_ref: "/instrumental.mp3",
      },
    }))).toBe("Karaoke is not available for this song yet.");
  });
});
