import { describe, expect, test } from "bun:test";

import { resolveVideoSongCapabilities } from "./use-video-viewer-song-capabilities";

describe("resolveVideoSongCapabilities", () => {
  test("uses server-stated Study and Sing capability", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "ready" },
        study_capability: { status: "locked" },
      } as never,
      readMode: "public",
      sourcePostId: "pst_song",
    })).toMatchObject({
      karaoke: "ready",
      karaokeHref: "/p/pst_song/karaoke",
      readMode: "public",
      study: "locked",
      studyHref: undefined,
    });
  });

  test("fails closed when the linked song requires age proof", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: "proof_required",
        karaoke_capability: { status: "ready" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      sourcePostId: "pst_song",
    })).toMatchObject({ karaoke: "unavailable", study: "unavailable" });
  });
});
