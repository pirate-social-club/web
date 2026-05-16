import { afterEach, describe, expect, test } from "bun:test";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { toCommunityPostContent } from "@/app/authenticated-helpers/post-presentation";
import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";

const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
});

function unixTimestamp(value: string): number {
  return Math.floor(Date.parse(value) / 1000);
}

function createAnchoredLivePost(): LocalizedPostResponse {
  return {
    post: {
      access_mode: null,
      age_gate_policy: "none",
      analysis_state: "allow",
      anchor_live_room: "lr_friday_night_set",
      anchor_live_room_status: "scheduled",
      anonymous_label: null,
      anonymous_scope: null,
      asset: null,
      author_user: "usr_host",
      authorship_mode: "human_direct",
      body: "Join the live room tonight.",
      caption: null,
      community: "cmt_tameimpala",
      content_safety_state: "safe",
      created: unixTimestamp("2026-05-16T09:00:00.000Z"),
      disclosed_qualifiers_json: null,
      id: "pst_friday_night_set",
      identity_mode: "public",
      media_refs: [],
      object: "post",
      post_type: "text",
      source_language: "en",
      status: "published",
      title: "Friday night set",
      visibility: "public",
    },
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    resolved_locale: "en",
    source_hash: "src_live_room",
    thread_snapshot: null,
    translated_body: null,
    translated_caption: null,
    translated_title: null,
    translation_state: "same_language",
    upvote_count: 0,
    viewer_reaction_kinds: [],
    viewer_vote: null,
  } as unknown as LocalizedPostResponse;
}

function createLiveRoomAccess(): ApiLiveRoomAccessResponse {
  return {
    access: {
      access_mode: "free",
      allowed: false,
      decision_reason: "not_live",
      guest_invite_status: null,
      listing: null,
      purchase_entitlement: null,
      visibility: "public",
    },
    room: {
      access_mode: "free",
      anchor_post: "pst_friday_night_set",
      broadcast_ref: null,
      canceled_at: null,
      community: "cmt_tameimpala",
      cover_ref: null,
      created: unixTimestamp("2026-05-16T08:00:00.000Z"),
      description: "A live run through the new material.",
      ended_at: unixTimestamp("2026-05-16T11:00:00.000Z"),
      event_start_at: unixTimestamp("2026-05-16T14:00:00.000Z"),
      guest_user: null,
      host_user: "usr_host",
      id: "lr_friday_night_set",
      live_started_at: unixTimestamp("2026-05-16T11:45:00.000Z"),
      object: "live_room",
      performer_allocations: [],
      replay_status: "none",
      room_kind: "solo",
      setlist: {
        id: "lrs_friday_night_set",
        items: [],
        object: "live_room_setlist",
        status: "ready",
      },
      status: "scheduled",
      title: "Friday Night Studio Set",
      visibility: "public",
    },
  } as unknown as ApiLiveRoomAccessResponse;
}

describe("post presentation live rooms", () => {
  test("maps live room timestamps into post card labels", () => {
    Date.now = () => Date.parse("2026-05-16T12:00:00.000Z");

    const content = toCommunityPostContent(createAnchoredLivePost(), undefined, {
      liveRoom: {
        access: createLiveRoomAccess(),
      },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.startsAtLabel).toBe("in 2h");
    expect(content.liveSinceLabel).toBe("15m");
    expect(content.endedAtLabel).toBe("1h");
  });

  test("normalizes replay status from the API room payload", () => {
    Date.now = () => Date.parse("2026-05-16T12:00:00.000Z");

    const readyAccess = createLiveRoomAccess();
    readyAccess.room.replay_status = "ready";
    readyAccess.room.status = "ended";
    readyAccess.access.allowed = false;
    readyAccess.access.decision_reason = "ended";

    const content = toCommunityPostContent(createAnchoredLivePost(), undefined, {
      liveRoom: { access: readyAccess },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.replayStatus).toBe("ready");
  });

  test("defaults replay status to none for unrecognized values", () => {
    Date.now = () => Date.parse("2026-05-16T12:00:00.000Z");

    const weirdAccess = createLiveRoomAccess();
    weirdAccess.room.replay_status = "some_unknown_value";

    const content = toCommunityPostContent(createAnchoredLivePost(), undefined, {
      liveRoom: { access: weirdAccess },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.replayStatus).toBe("none");
  });

  test("maps membership-required live-room access to gate-required UI", () => {
    const gatedAccess = createLiveRoomAccess();
    gatedAccess.access.access_mode = "gated";
    gatedAccess.access.decision_reason = "membership_required";
    gatedAccess.room.access_mode = "gated";

    const content = toCommunityPostContent(createAnchoredLivePost(), undefined, {
      liveRoom: { access: gatedAccess },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.accessMode).toBe("gated");
    expect(content.accessState).toBe("gate_required");
  });
});
