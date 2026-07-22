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

  test("annotates only reward-eligible ready actions", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "ready" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      rewardOffer: {
        chain_id: 8453,
        daily_reward_cents: 200,
        eligible_activity: "karaoke",
        ends_at: Date.now() + 60_000,
        min_score_bps: 7_000,
      },
      sourcePostId: "pst_song",
    }).rewards).toEqual({ karaoke: { amountLabel: "$2" }, study: undefined });
  });

  test("does not advertise rewards when age proof hides the actions", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: "proof_required",
        karaoke_capability: { status: "ready" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      rewardOffer: {
        chain_id: 8453,
        daily_reward_cents: 100,
        eligible_activity: "either",
        ends_at: Date.now() + 60_000,
        min_score_bps: 7_000,
      },
      sourcePostId: "pst_song",
    }).rewards).toBeUndefined();
  });
});
