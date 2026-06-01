import { afterEach, describe, expect, test } from "bun:test";
import type { Asset, LocalizedPostResponse } from "@pirate/api-contracts";

import {
  resolveLocalizedLinkTitle,
  toCommunityPostContent,
  toThreadPostCard,
} from "@/app/authenticated-helpers/post-presentation";
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

function createLinkPost(overrides: Partial<LocalizedPostResponse["post"]> = {}): LocalizedPostResponse {
  return {
    post: {
      access_mode: null,
      age_gate_policy: "none",
      analysis_state: "allow",
      anonymous_label: null,
      anonymous_scope: null,
      asset: null,
      author_user: "usr_author",
      authorship_mode: "human_direct",
      body: "Read this.",
      caption: null,
      community: "cmt_links",
      content_safety_state: "safe",
      created: unixTimestamp("2026-05-16T09:00:00.000Z"),
      disclosed_qualifiers_json: null,
      embeds: [],
      id: "pst_link",
      identity_mode: "public",
      link_enrichment: null,
      link_og_image_url: null,
      link_og_title: null,
      link_url: "https://example.com/story",
      media_refs: [],
      object: "post",
      post_type: "link",
      source_language: "en",
      status: "published",
      title: "Story",
      visibility: "public",
      ...overrides,
    },
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    resolved_locale: "en",
    source_hash: "src_link",
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

function createSongPost(overrides: Partial<LocalizedPostResponse["post"]> = {}): LocalizedPostResponse {
  return {
    post: {
      access_mode: "public",
      age_gate_policy: "none",
      analysis_state: "allow",
      anonymous_label: null,
      anonymous_scope: null,
      asset: null,
      author_user: "usr_artist",
      authorship_mode: "human_direct",
      body: null,
      caption: "New track.",
      community: "cmt_songs",
      content_safety_state: "safe",
      created: unixTimestamp("2026-05-16T09:00:00.000Z"),
      disclosed_qualifiers_json: null,
      id: "pst_song",
      identity_mode: "public",
      media_refs: [],
      object: "post",
      post_type: "song",
      song_annotations_url: "https://genius.com/34172986",
      song_artifact_bundle: "sab_song",
      song_title: "Midnight Waves",
      source_language: "en",
      status: "published",
      title: "Midnight Waves",
      visibility: "public",
      ...overrides,
    },
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    resolved_locale: "en",
    song_presentation: null,
    source_hash: "src_song",
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

function createSongAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    access_mode: "public",
    asset_kind: "song_audio",
    commercial_rev_share_pct: 10,
    community: "com_cmt_songs",
    created: unixTimestamp("2026-05-16T09:00:00.000Z"),
    creator_user: "usr_artist",
    display_title: "Midnight Waves",
    id: "asset_ast_song",
    license_preset: "commercial-remix",
    locked_delivery_status: "none",
    object: "asset",
    primary_content_ref: "storage://song",
    publication_status: "draft",
    rights_basis: "original",
    source_post: "post_pst_song",
    story_error: null,
    story_status: "none",
    story_royalty_registration_status: "none",
    ...overrides,
  };
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

  test("passes participants through from live room options", () => {
    const participants = [
      { role: "host" as const, label: "host.pirate", href: "/u/host.pirate" },
      { role: "guest" as const, label: "guest.pirate", href: "/u/guest.pirate" },
    ];

    const content = toCommunityPostContent(createAnchoredLivePost(), undefined, {
      liveRoom: {
        access: createLiveRoomAccess(),
        participants,
      },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.participants).toEqual(participants);
  });

  test("falls back to post media when a live room cover ref is not renderable", () => {
    const post = createAnchoredLivePost();
    post.post.media_refs = [{
      storage_ref: "https://media.test/live-cover.jpg",
      mime_type: "image/jpeg",
      size_bytes: 12,
    }];
    const access = createLiveRoomAccess();
    access.room.cover_ref = "media_cover";

    const content = toCommunityPostContent(post, undefined, {
      liveRoom: {
        access,
      },
    });

    expect(content.type).toBe("live_room");
    if (content.type !== "live_room") return;
    expect(content.coverSrc).toBe("https://media.test/live-cover.jpg");
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

describe("post presentation links", () => {
  test("detects X links without server-side embed enrichment", () => {
    const content = toCommunityPostContent(createLinkPost({
      link_url: "https://twitter.com/pirate/status/1234567890",
    }));

    expect(content.type).toBe("embed");
    if (content.type !== "embed") return;
    expect(content.provider).toBe("x");
    expect(content.canonicalUrl).toBe("https://x.com/pirate/status/1234567890");
  });

  test("falls back to translated post title when link enrichment is not translated", () => {
    const post = {
      ...createLinkPost({
      link_enrichment: {
        source_language: "ja",
        title: "日本語のタイトル",
      },
      source_language: "ja",
      title: "日本語の投稿",
    }),
      translated_title: "English fallback",
      translation_state: "ready" as const,
    };

    const title = resolveLocalizedLinkTitle(post, {
      viewerContentLocale: "en",
    });

    expect(title.title).toBe("English fallback");
  });
});

describe("post presentation songs", () => {
  test("maps song annotations URL into song card content", () => {
    const content = toCommunityPostContent(createSongPost());

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.annotationsUrl).toBe("https://genius.com/34172986");
  });

  test("maps canonical song presentation into song card content", () => {
    const post = createSongPost({
      song_title: "Legacy song title",
      title: "Launch announcement",
    });
    post.song_presentation = {
      title: "Canonical track title",
      cover_art_ref: "https://media.test/cover.jpg",
      duration_ms: 123456,
    };

    const content = toCommunityPostContent(post);

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.title).toBe("Canonical track title");
    expect(content.artworkSrc).toBe("https://media.test/cover.jpg");
    expect(content.durationMs).toBe(123456);
  });

  test("maps song age gate state and verification callback into song card content", () => {
    const onVerifyAge = () => undefined;
    const content = toCommunityPostContent(
      {
        ...createSongPost({
          age_gate_policy: "18_plus",
          content_safety_state: "adult",
        }),
        age_gate_viewer_state: "verified_allowed",
      } as LocalizedPostResponse,
      undefined,
      { onVerifyAge },
    );

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.ageGatePolicy).toBe("18_plus");
    expect(content.ageGateViewerState).toBe("verified_allowed");
    expect(content.contentSafetyState).toBe("adult");
    expect(content.onVerifyAge).toBe(onVerifyAge);
  });

  test("maps Story royalty registration failures into song card content", () => {
    const content = toCommunityPostContent(
      createSongPost({ asset: "asset_ast_song" }),
      {
        asset: createSongAsset({
          story_error: "royalty_registration_failed:story_royalty_config_missing",
          story_royalty_registration_status: "failed",
        }),
      },
    );

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.storyRegistration?.state).toBe("failed");
    expect(content.storyRegistration?.label).toBe("IP registration failed");
    expect(content.storyRegistration?.description).toContain("configuration is missing");
  });

  test("does not surface completed Story registration as a song card badge", () => {
    const content = toCommunityPostContent(
      createSongPost({ asset: "asset_ast_song" }),
      {
        asset: createSongAsset({
          story_ip: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
          story_royalty_registration_status: "registered",
        }),
      },
    );

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.storyRegistration).toBeUndefined();
  });

  test("maps registered post asset Story summaries into the post menu", () => {
    const post = createSongPost({ asset: "asset_ast_song" });
    post.asset_story = {
      story_ip: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      story_royalty_registration_status: "registered",
    };

    const card = toThreadPostCard(post, {
      id: "com_cmt_songs",
      display_name: "Songs",
      namespace_verification: null,
      route_slug: null,
    });

    expect(card.menuItems).toContainEqual({
      key: "view-story",
      label: "View on Story",
    });
  });

  test("maps transient Story license reuse notices into song card content", () => {
    const content = toCommunityPostContent(
      createSongPost({ asset: "asset_ast_song" }),
      {
        storyLicenseNotice: {
          label: "Story license reused",
          description: "This upload reused an existing Story registration, so it keeps the original terms: Commercial remix, 10% royalty.",
        },
      },
    );

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.storyLicenseNotice?.label).toBe("Story license reused");
    expect(content.storyLicenseNotice?.description).toContain("Commercial remix, 10% royalty");
  });
});
