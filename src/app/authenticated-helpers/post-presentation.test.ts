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

function createVideoPost(overrides: Partial<LocalizedPostResponse["post"]> = {}): LocalizedPostResponse {
  return {
    post: {
      access_mode: "public",
      age_gate_policy: "none",
      analysis_state: "allow",
      anonymous_label: null,
      anonymous_scope: null,
      asset: null,
      author_user: "usr_video",
      authorship_mode: "human_direct",
      body: null,
      caption: "New video.",
      community: "cmt_video",
      content_safety_state: "safe",
      created: unixTimestamp("2026-05-16T09:00:00.000Z"),
      disclosed_qualifiers_json: null,
      id: "pst_video",
      identity_mode: "public",
      media_refs: [],
      object: "post",
      post_type: "video",
      source_language: "en",
      status: "published",
      title: "Portrait video",
      visibility: "public",
      ...overrides,
    },
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    resolved_locale: "en",
    source_hash: "src_video",
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

describe("post presentation videos", () => {
  test("maps persisted portrait poster dimensions into card aspect ratio", () => {
    const content = toCommunityPostContent(createVideoPost({
      media_refs: [{
        storage_ref: "https://media.test/video.mp4",
        mime_type: "video/mp4",
        size_bytes: 12,
        poster_ref: "https://media.test/poster.jpg",
        poster_width: 720,
        poster_height: 1280,
      }],
    } as unknown as Partial<LocalizedPostResponse["post"]>));

    expect(content.type).toBe("video");
    if (content.type !== "video") return;
    expect(content.aspectRatio).toBe(9 / 16);
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

  test("maps public song media proof into original storage proof", () => {
    const content = toCommunityPostContent(createSongPost({
      media_refs: [{
        storage_ref: "https://media.test/song.mp3",
        mime_type: "audio/mpeg",
        decentralized_storage: {
          provider: "filebase_ipfs",
          cid: "bafyoriginal",
          gateway_url: "https://dweb.link/ipfs/bafyoriginal",
        },
      }],
    } as unknown as Partial<LocalizedPostResponse["post"]>));

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.storageProofs?.original).toEqual({
      cid: "bafyoriginal",
      gatewayUrl: "https://dweb.link/ipfs/bafyoriginal",
      encrypted: undefined,
    });
    expect(content.storageProofs?.preview).toBeUndefined();
  });

  test("derives public song IPFS proof from gateway refs when nested proof metadata is absent", () => {
    const content = toCommunityPostContent(createSongPost({
      media_refs: [{
        storage_ref: "https://dweb.link/ipfs/bafygateway/song.mp3",
        mime_type: "audio/mpeg",
        ipfs_cid: "bafygateway",
      }],
    } as unknown as Partial<LocalizedPostResponse["post"]>));

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.storageProofs?.original).toEqual({
      cid: "bafygateway",
      gatewayUrl: "https://dweb.link/ipfs/bafygateway/song.mp3",
      encrypted: undefined,
    });
  });

  test("maps locked song media proof into preview storage proof for non-entitled viewers", () => {
    const content = toCommunityPostContent(createSongPost({
      access_mode: "locked",
      media_refs: [{
        storage_ref: "https://media.test/song-preview.mp3",
        mime_type: "audio/mpeg",
        decentralized_storage: {
          provider: "filebase_ipfs",
          cid: "bafypreview",
          gateway_url: "https://dweb.link/ipfs/bafypreview",
        },
      }],
    } as unknown as Partial<LocalizedPostResponse["post"]>));

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.hasEntitlement).toBe(false);
    expect(content.storageProofs?.preview).toEqual({
      cid: "bafypreview",
      gatewayUrl: "https://dweb.link/ipfs/bafypreview",
      encrypted: undefined,
    });
    expect(content.storageProofs?.original).toBeUndefined();
  });

  test("maps public downloadable song audio into direct download actions", () => {
    const post = createSongPost();
    post.post.media_refs = [{
      storage_ref: "/public-communities/cmt_songs/song-artifact-uploads/sau_original/content",
      mime_type: "audio/mpeg",
      decentralized_storage: {
        provider: "filebase_ipfs",
        cid: "bafyoriginal",
        gateway_url: "https://dweb.link/ipfs/bafyoriginal",
      },
    }];
    post.song_presentation = {
      title: "Canonical track title",
      cover_art_ref: "https://media.test/cover.jpg",
      duration_ms: 123456,
      instrumental_audio: {
        storage_ref: "/public-communities/cmt_songs/song-artifact-uploads/sau_instrumental/content",
        mime_type: "audio/mpeg",
        duration_ms: 123456,
        decentralized_storage: {
          provider: "filebase_ipfs",
          cid: "bafyinstrumental",
          gateway_url: "https://dweb.link/ipfs/bafyinstrumental",
        },
      },
      vocal_audio: {
        storage_ref: "/public-communities/cmt_songs/song-artifact-uploads/sau_vocals/content",
        mime_type: "audio/mpeg",
        duration_ms: 120000,
        decentralized_storage: {
          provider: "filebase_ipfs",
          cid: "bafyvocals",
          gateway_url: "https://dweb.link/ipfs/bafyvocals",
        },
      },
    } as NonNullable<LocalizedPostResponse["song_presentation"]>;

    const content = toCommunityPostContent(post);

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.downloadPolicy).toBe("free_download");
    expect(typeof content.onDownload).toBe("function");
    expect(content.storageProofs?.original).toEqual({
      cid: "bafyoriginal",
      gatewayUrl: "https://dweb.link/ipfs/bafyoriginal",
      encrypted: undefined,
    });
    expect(content.stems?.map((stem) => ({
      kind: stem.kind,
      accessPolicy: stem.accessPolicy,
      durationMs: stem.durationMs,
      hasDownload: Boolean(stem.onDownload),
    }))).toEqual([
      {
        kind: "instrumental",
        accessPolicy: "free",
        durationMs: 123456,
        hasDownload: true,
      },
      {
        kind: "vocals",
        accessPolicy: "free",
        durationMs: 120000,
        hasDownload: true,
      },
    ]);
    expect(content.entitledStems).toEqual(["instrumental", "vocals"]);
  });

  test("maps derivative source summaries into song card content", () => {
    const post = createSongPost({
      rights_basis: "derivative",
      song_mode: "remix",
      upstream_asset_refs: ["story:ip:0x01C0D038e1BA42959b83A56e5A1c459594719297#licenseTermsId=1894"],
    });
    post.derivative_sources = [
      {
        source_ref: "story:ip:0x01C0D038e1BA42959b83A56e5A1c459594719297#licenseTermsId=1894",
        title: "Travel Guide",
        kind: "song",
        relationship_type: "remix_of",
        community: "com_cmt_songs",
        asset: "asset_ast_original",
        source_post: "post_pst_original",
        story_ip: "0x01C0D038e1BA42959b83A56e5A1c459594719297",
        story_license_terms: "1894",
        creator_user: "usr_artist",
        creator_handle: "4dmonsterlobsters.pirate",
      },
    ];

    const content = toCommunityPostContent(post);

    expect(content.type).toBe("song");
    if (content.type !== "song") return;
    expect(content.upstreamAttributions).toEqual([
      {
        assetId: "asset_ast_original",
        relationshipType: "remix_of",
        title: "Travel Guide",
        artist: "4dmonsterlobsters.pirate",
        href: "/p/post_pst_original",
      },
    ]);
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

    expect(card.menuItems).toContainEqual(expect.objectContaining({
      key: "view-story",
      label: "View on Story",
    }));
    expect(card.menuItems?.find((item) => item.key === "view-story")?.icon).toBeTruthy();
  });

  test("surfaces ElasticStage vinyl release metadata from listings and purchases", () => {
    const listingVinylUrl = "https://elasticstage.com/saint-pablo/releases/benefit-single";
    const purchaseVinylUrl = "https://elasticstage.com/saint-pablo/releases/benefit-single-owned";
    const listedContent = toCommunityPostContent(
      createSongPost({
        access_mode: "locked",
        asset: "asset_ast_song",
      }),
      {
        listing: {
          id: "lst_vinyl",
          object: "community_listing",
          community: "com_cmt_songs",
          asset: "asset_ast_song",
          listing_mode: "fixed_price",
          status: "active",
          price_cents: 399,
          regional_pricing_enabled: false,
          vinyl_release_provider: "elasticstage",
          vinyl_release_url: listingVinylUrl,
          created_by_user: "usr_artist",
          created: unixTimestamp("2026-05-16T09:00:00.000Z"),
        },
      },
    );

    expect(listedContent.type).toBe("song");
    if (listedContent.type !== "song") return;
    expect(listedContent.vinylRelease).toEqual({
      available: true,
      provider: "elasticstage",
      url: listingVinylUrl,
    });

    const ownedContent = toCommunityPostContent(
      createSongPost({
        access_mode: "locked",
        asset: "asset_ast_song",
      }),
      {
        listing: {
          id: "lst_vinyl",
          object: "community_listing",
          community: "com_cmt_songs",
          asset: "asset_ast_song",
          listing_mode: "fixed_price",
          status: "active",
          price_cents: 399,
          regional_pricing_enabled: false,
          vinyl_release_provider: "elasticstage",
          vinyl_release_url: listingVinylUrl,
          created_by_user: "usr_artist",
          created: unixTimestamp("2026-05-16T09:00:00.000Z"),
        },
        purchase: {
          id: "pur_vinyl",
          object: "community_purchase",
          community: "com_cmt_songs",
          listing: "lst_vinyl",
          asset: "asset_ast_song",
          buyer_user: "usr_listener",
          settlement_wallet_attachment: "uwa_primary",
          purchase_price_cents: 399,
          settlement_mode: "royalty_native_story_payment",
          settlement_chain: { chain_namespace: "eip155", chain_id: 1315, display_name: "Story Aeneid" },
          settlement_token: "WIP",
          settlement_tx_ref: "0xsettled",
          allocations: [],
          vinyl_release_provider: "elasticstage",
          vinyl_release_url: purchaseVinylUrl,
          purchase_entitlement: "pe_vinyl",
          entitlement_kind: "asset_access",
          entitlement_target_ref: "asset_ast_song",
          created: unixTimestamp("2026-05-16T09:00:00.000Z"),
        },
      },
    );

    expect(ownedContent.type).toBe("song");
    if (ownedContent.type !== "song") return;
    expect(ownedContent.vinylRelease?.url).toBe(purchaseVinylUrl);
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
