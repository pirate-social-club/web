import { describe, expect, test } from "bun:test";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { toKaraokeCapability } from "./post-media-presentation";

function songPost(opts: {
  instrumental?: boolean;
  communityKaraokeEnabled?: boolean;
} = {}): ApiPost {
  const { instrumental = true, communityKaraokeEnabled = true } = opts;
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
        downloadable_audio: [{ kind: "instrumental", storage_ref: "/i.mp3", mime_type: "audio/mpeg" }],
      },
    } as unknown as ApiPost;
    expect(toKaraokeCapability(post)).toBeUndefined();
  });
});
