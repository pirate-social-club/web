import { describe, expect, test } from "bun:test";

import { resolveVideoSongCapabilities } from "./use-video-viewer-song-capabilities";

describe("resolveVideoSongCapabilities", () => {
  test("uses server-stated Study and Sing capability", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "ready" },
        post: { community: "cmt_song" },
        song_presentation: { cover_art_ref: "https://media.test/song-cover.webp" },
        study_capability: { status: "locked" },
      } as never,
      readMode: "public",
      sourcePostId: "pst_song",
    })).toMatchObject({
      artworkSrc: "https://media.test/song-cover.webp",
      karaoke: "ready",
      karaokeHref: "/p/pst_song/karaoke",
      learningGate: "allowed",
      readMode: "public",
      study: "locked",
      studyHref: undefined,
    });
  });

  test("does not invent artwork when the linked song has no cover", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "ready" },
        post: { community: "cmt_song" },
        song_presentation: { cover_art_ref: null },
        study_capability: { status: "ready" },
      } as never,
      readMode: "public",
      sourcePostId: "pst_song",
    }).artworkSrc).toBeUndefined();
  });

  test("keeps hrefs while flagging age-restricted learning actions", () => {
    // The learning gate marks the linked song's Sing/Study access, not the post.
    // Hrefs stay live: gated taps route to verification (feed handler or the
    // deep link's own verification_required screen), never to a dead lock.
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: "proof_required",
        karaoke_capability: { status: "ready" },
        post: { community: "cmt_song" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      sourcePostId: "pst_song",
    })).toMatchObject({
      karaoke: "ready",
      karaokeHref: "/p/pst_song/karaoke",
      learningGate: "age_proof_required",
      study: "ready",
      studyHref: "/p/pst_song/study",
    });
  });

  test("preserves processing and failed states for feed presentation", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "processing" },
        post: { community: "cmt_song" },
        study_capability: { status: "failed" },
      } as never,
      readMode: "public",
      sourcePostId: "pst_song",
    })).toMatchObject({ karaoke: "processing", study: "failed" });
  });

  test("annotates only reward-eligible ready actions", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: null,
        karaoke_capability: { status: "ready" },
        post: { community: "cmt_song" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      rewardOffer: {
        campaign: "rcp_song",
        chain_id: 8453,
        daily_reward_cents: 200,
        eligible_activity: "karaoke",
        ends_at: Date.now() + 60_000,
        min_score_bps: 7_000,
      },
      sourcePostId: "pst_song",
    }).rewards).toEqual({ karaoke: { amountLabel: "$2" }, study: undefined });
  });

  test("does not advertise rewards while age proof is still required", () => {
    expect(resolveVideoSongCapabilities({
      post: {
        age_gate_viewer_state: "proof_required",
        karaoke_capability: { status: "ready" },
        post: { community: "cmt_song" },
        study_capability: { status: "ready" },
      } as never,
      readMode: "authenticated",
      rewardOffer: {
        campaign: "rcp_song",
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
