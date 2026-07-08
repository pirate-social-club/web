import { describe, expect, test } from "bun:test";
import type { PublicProfileResolution } from "@pirate/api-contracts";
import type {
  ApiCreateLiveRoomRequest,
  ApiLiveRoom,
  ApiPublishLiveRoomRequest,
  ApiPublishLiveRoomResponse,
} from "@/lib/api/client-api-types";

import { buildLiveRoomRequest, resolveLiveRoomGuestUserId, submitLiveRoom } from "./live";

function createLiveRoom(overrides: Partial<ApiLiveRoom> = {}): ApiLiveRoom {
  return {
    id: "liv_test",
    object: "live_room",
    community: "com_test",
    anchor_post: "pst_live_anchor",
    host_user: "usr_host",
    guest_user: null,
    room_kind: "solo",
    status: "scheduled",
    access_mode: "free",
    visibility: "public",
    audience_gate: null,
    title: "Live room",
    description: null,
    cover_ref: null,
    store_url: null,
    store_label: null,
    event_start_at: null,
    live_started_at: null,
    ended_at: null,
    canceled_at: null,
    broadcast_ref: null,
    replay_status: "none",
    performer_allocations: [],
    setlist: {
      id: "lst_setlist",
      object: "live_room_setlist",
      status: "ready",
      items: [],
    },
    created: 1,
    ...overrides,
  };
}

function createCoverFile() {
  return new File(["cover"], "cover.jpg", { type: "image/jpeg" });
}

function createPublicProfileResolution(userId: string): PublicProfileResolution {
  return {
    profile: { id: userId },
    requested_handle_label: "name.pirate",
    resolved_handle_label: "name.pirate",
    is_canonical: true,
    created_communities: [],
  } as PublicProfileResolution;
}

describe("live create-post submit helpers", () => {
  test("buildLiveRoomRequest maps setlist, guest, schedule, and cover fields", () => {
    const request = buildLiveRoomRequest({
      coverRef: "media_cover",
      description: " Live description ",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "duet",
        accessMode: "paid",
        visibility: "unlisted",
        guestUserId: " usr_guest ",
        scheduleForLater: true,
        scheduleAt: "2026-05-16T12:30:00.000Z",
        storeUrl: " https://psc-zim-shop.fourthwall.com/ ",
        storeLabel: " Event merch ",
        setlistStatus: "ready",
        performerAllocations: [
          { role: "host", userId: "", sharePct: 60 },
          { role: "guest", userId: "", sharePct: 40 },
        ],
        setlistItems: [
          {
            declaredTrackId: "sab_song_bundle",
            titleText: " Catalog Song ",
            artistText: " Catalog Artist ",
            performanceKind: "original",
          },
          {
            declaredTrackId: "story:asset:ast_source",
            titleText: " Source Asset ",
            artistText: "",
            performanceKind: "cover",
          },
          {
            declaredTrackId: "trk_fallback",
            titleText: "Fallback Song",
            performanceKind: "unknown",
          },
        ],
      },
      title: " Live title ",
    });

    expect(request).toEqual({
      title: "Live title",
      description: "Live description",
      anonymous_scope: undefined,
      disclosed_qualifier_ids: undefined,
      identity_mode: "public",
      room_kind: "duet",
      access_mode: "paid",
      visibility: "unlisted",
      guest_user: "usr_guest",
      event_start_at: Date.parse("2026-05-16T12:30:00.000Z") / 1000,
      cover_ref: "media_cover",
      store_url: "https://psc-zim-shop.fourthwall.com/",
      store_label: "Event merch",
      recording_enabled: false,
      performer_allocations: [
        { user: "usr_host", role: "host", share_bps: 6000 },
        { user: "usr_guest", role: "guest", share_bps: 4000 },
      ],
      setlist: {
        status: "ready",
        items: [
          {
            song_artifact_bundle: "sab_song_bundle",
            source_asset_ref: undefined,
            title: "Catalog Song",
            artist: "Catalog Artist",
            rights_basis: "original",
            rights_status: "pending",
          },
          {
            song_artifact_bundle: undefined,
            source_asset_ref: "story:asset:ast_source",
            title: "Source Asset",
            artist: undefined,
            rights_basis: "cover",
            rights_status: "pending",
          },
          {
            song_artifact_bundle: undefined,
            source_asset_ref: undefined,
            title: "Fallback Song",
            artist: undefined,
            rights_basis: "unknown",
            rights_status: "pending",
          },
        ],
      },
    });
  });

  test("buildLiveRoomRequest forwards anonymous identity fields", () => {
    const request = buildLiveRoomRequest({
      anonymousScope: "community_stable",
      description: "",
      disclosedQualifierIds: ["qual_unique_human"],
      hostUserId: "usr_host",
      identityMode: "anonymous",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      title: "Anonymous live",
    });

    expect(request).toMatchObject({
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_unique_human"],
      identity_mode: "anonymous",
    });
  });

  test("buildLiveRoomRequest ignores stale schedule values for immediate rooms", () => {
    const request = buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        scheduleForLater: false,
        scheduleAt: "2026-05-16T12:30:00.000Z",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      title: "Immediate room",
    });

    expect(request.event_start_at).toBeNull();
  });

  test("buildLiveRoomRequest forwards recording_enabled when the host opts in", () => {
    const request = buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        recordingEnabled: true,
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      title: "Recorded room",
    });

    expect(request.recording_enabled).toBe(true);
  });

  test("buildLiveRoomRequest writes an explicit community-members gate for gated rooms by default", () => {
    const request = buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "gated",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      title: "Gated room",
    });

    expect(request.audience_gate).toEqual({
      version: 1,
      match: "any",
      segments: [{ type: "community_members" }],
    });
  });

  test("buildLiveRoomRequest writes selected asset buyer gates", () => {
    const request = buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "gated",
        audienceGateMode: "purchase_entitlement",
        audienceGateTargetRefs: ["story:asset:ast_source", "asset_ast_catalog", "asset_ast_catalog"],
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{
          declaredTrackId: "story:asset:ast_source",
          titleText: "Source Song",
          performanceKind: "original",
        }],
      },
      title: "Buyer room",
    });

    expect(request.audience_gate).toEqual({
      version: 1,
      match: "any",
      segments: [{
        type: "purchase_entitlement",
        entitlement_kind: "asset_access",
        target_refs: ["asset_ast_source", "asset_ast_catalog"],
      }],
    });
  });

  test("buildLiveRoomRequest rejects buyer gates with no valid selected assets", () => {
    expect(() => buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "gated",
        audienceGateMode: "purchase_entitlement",
        audienceGateTargetRefs: ["trk_fallback", "sab_bundle"],
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      title: "Buyer room",
    })).toThrow("Select at least one catalog song for buyer access.");
  });

  test("resolveLiveRoomGuestUserId preserves Pirate user ids", async () => {
    let resolveCalls = 0;

    const resolved = await resolveLiveRoomGuestUserId({
      guestUserId: " usr_guest ",
      resolveProfileByHandle: async () => {
        resolveCalls += 1;
        return createPublicProfileResolution("usr_other");
      },
    });

    expect(resolved).toBe("usr_guest");
    expect(resolveCalls).toBe(0);
  });

  test("resolveLiveRoomGuestUserId resolves cohost handles to Pirate user ids", async () => {
    const handleCalls: string[] = [];

    const resolved = await resolveLiveRoomGuestUserId({
      guestUserId: " @name.pirate ",
      resolveProfileByHandle: async (handleLabel) => {
        handleCalls.push(handleLabel);
        return createPublicProfileResolution("usr_guest");
      },
    });

    expect(resolved).toBe("usr_guest");
    expect(handleCalls).toEqual(["name.pirate"]);
  });

  test("submitLiveRoom uploads cover media and creates a free room", async () => {
    const coverFile = createCoverFile();
    const createLiveRoomCalls: Array<{
      communityId: string;
      request: ApiCreateLiveRoomRequest;
    }> = [];
    const publishLiveRoomCalls: ApiPublishLiveRoomRequest[] = [];
    const uploadMediaCalls: Array<{ kind: "post_image"; file: File }> = [];

    const result = await submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async (communityId, request) => {
        createLiveRoomCalls.push({ communityId, request });
        return createLiveRoom({ id: "liv_free", anchor_post: "pst_free_anchor" });
      },
      description: "Room body",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        coverUpload: coverFile,
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{
          titleText: "Song",
          performanceKind: "original",
        }],
      },
      paidLiveRoomPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: false,
      publishLiveRoom: async (_communityId, request) => {
        publishLiveRoomCalls.push(request);
        return { room: createLiveRoom(), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: false,
      title: "Free room",
      uploadMedia: async (input) => {
        uploadMediaCalls.push({ kind: input.kind, file: input.file });
        return { media_ref: "media_cover" };
      },
    });

    expect(result.anchor_post).toBe("pst_free_anchor");
    expect(uploadMediaCalls).toEqual([{ kind: "post_image", file: coverFile }]);
    expect(createLiveRoomCalls).toEqual([{
      communityId: "com_test",
      request: {
        title: "Free room",
        anonymous_scope: undefined,
        description: "Room body",
        disclosed_qualifier_ids: undefined,
        identity_mode: "public",
        room_kind: "solo",
        access_mode: "free",
        visibility: "public",
        guest_user: null,
        event_start_at: null,
        cover_ref: "media_cover",
        recording_enabled: false,
        performer_allocations: undefined,
        setlist: {
          status: "ready",
          items: [{
            song_artifact_bundle: undefined,
            source_asset_ref: undefined,
            title: "Song",
            artist: undefined,
            rights_basis: "original",
            rights_status: "pending",
          }],
        },
      },
    }]);
    expect(publishLiveRoomCalls).toEqual([]);
  });

  test("submitLiveRoom reports prepare_media before the cover upload and publish_post before create (free room)", async () => {
    // A single interleaved timeline proves the media step is reported at the real
    // upload, not fired up-front before the slow work begins.
    const timeline: string[] = [];

    await submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async () => {
        timeline.push("create");
        return createLiveRoom({ anchor_post: "pst_free_anchor" });
      },
      description: "Room body",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        coverUpload: createCoverFile(),
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      paidLiveRoomPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: false,
      publishLiveRoom: async () => {
        timeline.push("publish");
        return { room: createLiveRoom(), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: false,
      reportProgress: (key) => timeline.push(`progress:${key}`),
      title: "Free room",
      uploadMedia: async () => {
        timeline.push("upload");
        return { media_ref: "media_cover" };
      },
    });

    expect(timeline).toEqual([
      "progress:prepare_media",
      "upload",
      "progress:publish_post",
      "create",
    ]);
  });

  test("submitLiveRoom reports create_listing then publish_post around the paid publish call", async () => {
    const timeline: string[] = [];

    await submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async () => {
        timeline.push("create");
        return createLiveRoom();
      },
      description: "Room body",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "paid",
        visibility: "public",
        coverUpload: createCoverFile(),
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{ titleText: "Song", performanceKind: "original" }],
      },
      paidLiveRoomPriceUsd: 5,
      pricingPolicyRegionalPricingEnabled: false,
      publishLiveRoom: async () => {
        timeline.push("publish");
        return { room: createLiveRoom(), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: false,
      reportProgress: (key) => timeline.push(`progress:${key}`),
      title: "Paid room",
      uploadMedia: async () => {
        timeline.push("upload");
        return { media_ref: "media_cover" };
      },
    });

    expect(timeline).toEqual([
      "progress:prepare_media",
      "upload",
      "progress:create_listing",
      "progress:publish_post",
      "publish",
    ]);
  });

  test("submitLiveRoom resolves duet cohost handles before publishing", async () => {
    const publishLiveRoomCalls: Array<{
      communityId: string;
      request: ApiPublishLiveRoomRequest;
    }> = [];
    const handleCalls: string[] = [];

    await submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async () => createLiveRoom(),
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "duet",
        accessMode: "paid",
        visibility: "public",
        guestUserId: "name.pirate",
        setlistStatus: "ready",
        performerAllocations: [
          { role: "host", userId: "", sharePct: 50 },
          { role: "guest", userId: "name.pirate", sharePct: 50 },
        ],
        setlistItems: [{
          titleText: "Song",
          performanceKind: "original",
        }],
      },
      paidLiveRoomPriceUsd: 5,
      pricingPolicyRegionalPricingEnabled: false,
      publishLiveRoom: async (communityId, request) => {
        publishLiveRoomCalls.push({ communityId, request });
        return { room: createLiveRoom({ room_kind: "duet", guest_user: "usr_guest" }), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: false,
      resolveProfileByHandle: async (handleLabel) => {
        handleCalls.push(handleLabel);
        return createPublicProfileResolution("usr_guest");
      },
      title: "Duet room",
      uploadMedia: async () => ({ media_ref: "media_cover" }),
    });

    expect(handleCalls).toEqual(["name.pirate"]);
    expect(publishLiveRoomCalls[0]?.request.room.guest_user).toBe("usr_guest");
    expect(publishLiveRoomCalls[0]?.request.room.performer_allocations).toEqual([
      { user: "usr_host", role: "host", share_bps: 5000 },
      { user: "usr_guest", role: "guest", share_bps: 5000 },
    ]);
  });

  test("submitLiveRoom publishes paid rooms with listing payload", async () => {
    const createLiveRoomCalls: ApiCreateLiveRoomRequest[] = [];
    const publishLiveRoomCalls: Array<{
      communityId: string;
      request: ApiPublishLiveRoomRequest;
    }> = [];

    await submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async (_communityId, request) => {
        createLiveRoomCalls.push(request);
        return createLiveRoom();
      },
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "paid",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{
          titleText: "Song",
          performanceKind: "original",
        }],
      },
      paidLiveRoomPriceUsd: 12.5,
      pricingPolicyRegionalPricingEnabled: true,
      publishLiveRoom: async (communityId, request) => {
        publishLiveRoomCalls.push({ communityId, request });
        return { room: createLiveRoom({ access_mode: "paid" }), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: true,
      title: "Paid room",
      uploadMedia: async () => ({ media_ref: "media_cover" }),
    });

    expect(createLiveRoomCalls).toEqual([]);
    expect(publishLiveRoomCalls).toEqual([{
      communityId: "com_test",
      request: {
        room: {
          title: "Paid room",
          anonymous_scope: undefined,
          description: undefined,
          disclosed_qualifier_ids: undefined,
          identity_mode: "public",
          room_kind: "solo",
          access_mode: "paid",
          visibility: "public",
          guest_user: null,
          event_start_at: null,
          cover_ref: undefined,
          recording_enabled: false,
          performer_allocations: [{ user: "usr_host", role: "host", share_bps: 10000 }],
          setlist: {
            status: "ready",
            items: [{
              song_artifact_bundle: undefined,
              source_asset_ref: undefined,
              title: "Song",
              artist: undefined,
              rights_basis: "original",
              rights_status: "pending",
            }],
          },
        },
        listing: {
          live_room: null,
          price_cents: 1250,
          regional_pricing_enabled: true,
          status: "active",
        },
      },
    }]);
  });

  test("submitLiveRoom rejects missing session users before side effects", async () => {
    const calls: string[] = [];

    await expect(submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async () => {
        calls.push("createLiveRoom");
        return createLiveRoom();
      },
      description: "",
      hostUserId: null,
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        coverUpload: createCoverFile(),
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{
          titleText: "Song",
          performanceKind: "original",
        }],
      },
      paidLiveRoomPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: false,
      publishLiveRoom: async () => {
        calls.push("publishLiveRoom");
        return { room: createLiveRoom(), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: false,
      title: "Room",
      uploadMedia: async () => {
        calls.push("uploadMedia");
        return { media_ref: "media_cover" };
      },
    })).rejects.toThrow("Sign in before creating a live room.");

    expect(calls).toEqual([]);
  });

  test("submitLiveRoom rejects paid rooms without listing payload", async () => {
    const publishLiveRoomCalls: ApiPublishLiveRoomRequest[] = [];

    await expect(submitLiveRoom({
      communityId: "com_test",
      createLiveRoom: async () => createLiveRoom(),
      description: "",
      hostUserId: "usr_host",
      identityMode: "public",
      liveState: {
        roomKind: "solo",
        accessMode: "paid",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [{
          titleText: "Song",
          performanceKind: "original",
        }],
      },
      paidLiveRoomPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: true,
      publishLiveRoom: async (_communityId, request) => {
        publishLiveRoomCalls.push(request);
        return { room: createLiveRoom(), listing: {} as ApiPublishLiveRoomResponse["listing"] };
      },
      regionalPricingEnabled: true,
      title: "Paid room",
      uploadMedia: async () => ({ media_ref: "media_cover" }),
    })).rejects.toThrow("Build a paid listing payload before publishing this live room.");

    expect(publishLiveRoomCalls).toEqual([]);
  });
});
