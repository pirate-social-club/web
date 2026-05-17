import { describe, expect, test } from "bun:test";
import type {
  ApiCreateLiveRoomRequest,
  ApiLiveRoom,
  ApiPublishLiveRoomRequest,
  ApiPublishLiveRoomResponse,
} from "@/lib/api/client-api-types";

import { buildLiveRoomRequest, submitLiveRoom } from "./live";

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
    title: "Live room",
    description: null,
    cover_ref: null,
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

describe("live create-post submit helpers", () => {
  test("buildLiveRoomRequest maps setlist, guest, schedule, and cover fields", () => {
    const request = buildLiveRoomRequest({
      coverRef: "media_cover",
      description: " Live description ",
      hostUserId: "usr_host",
      liveState: {
        roomKind: "duet",
        accessMode: "paid",
        visibility: "unlisted",
        guestUserId: " usr_guest ",
        scheduleForLater: true,
        scheduleAt: "2026-05-16T12:30:00.000Z",
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
      room_kind: "duet",
      access_mode: "paid",
      visibility: "unlisted",
      guest_user: "usr_guest",
      event_start_at: Date.parse("2026-05-16T12:30:00.000Z") / 1000,
      cover_ref: "media_cover",
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

  test("buildLiveRoomRequest ignores stale schedule values for immediate rooms", () => {
    const request = buildLiveRoomRequest({
      description: "",
      hostUserId: "usr_host",
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
        uploadMediaCalls.push(input);
        return { media_ref: "media_cover" };
      },
    });

    expect(result.anchor_post).toBe("pst_free_anchor");
    expect(uploadMediaCalls).toEqual([{ kind: "post_image", file: coverFile }]);
    expect(createLiveRoomCalls).toEqual([{
      communityId: "com_test",
      request: {
        title: "Free room",
        description: "Room body",
        room_kind: "solo",
        access_mode: "free",
        visibility: "public",
        guest_user: null,
        event_start_at: null,
        cover_ref: "media_cover",
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
          description: undefined,
          room_kind: "solo",
          access_mode: "paid",
          visibility: "public",
          guest_user: null,
          event_start_at: null,
          cover_ref: undefined,
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
