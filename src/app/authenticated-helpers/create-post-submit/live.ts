"use client";

import type {
  ApiCreateLiveRoomRequest,
  ApiLiveRoom,
  ApiLiveRoomRightsBasis,
  ApiPublishLiveRoomRequest,
  ApiPublishLiveRoomResponse,
} from "@/lib/api/client-api-types";
import type {
  LiveComposerState,
  LiveSetlistItemKind,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { buildLiveRoomListingRequest } from "@/app/authenticated-helpers/asset-submit";

type UploadedLiveCoverMedia = {
  media_ref: string;
};

type UploadLiveCoverMedia = (
  input: { kind: "post_image"; file: File },
) => Promise<UploadedLiveCoverMedia>;

type CreateLiveRoom = (
  communityId: string,
  request: ApiCreateLiveRoomRequest,
) => Promise<ApiLiveRoom>;

type PublishLiveRoom = (
  communityId: string,
  request: ApiPublishLiveRoomRequest,
) => Promise<ApiPublishLiveRoomResponse>;

function liveRightsBasisFromPerformanceKind(kind: LiveSetlistItemKind): ApiLiveRoomRightsBasis {
  if (kind === "original") return "original";
  if (kind === "cover") return "cover";
  return "unknown";
}

function eventStartFromScheduleAt(scheduleAt: string | undefined): number | null {
  const value = scheduleAt?.trim();
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function liveSetlistSongArtifactBundleId(declaredTrackId: string | undefined): string | undefined {
  const value = declaredTrackId?.trim();
  return value?.startsWith("sab_") ? value : undefined;
}

function liveSetlistSourceAssetRef(declaredTrackId: string | undefined): string | undefined {
  const value = declaredTrackId?.trim();
  return value?.startsWith("story:asset:") ? value : undefined;
}

export function buildLiveRoomRequest(input: {
  coverRef?: string | null;
  description: string;
  hostUserId: string;
  liveState: LiveComposerState;
  title: string;
}): ApiCreateLiveRoomRequest {
  const guestUserId = input.liveState.roomKind === "duet"
    ? input.liveState.guestUserId?.trim() || null
    : null;
  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    room_kind: input.liveState.roomKind,
    access_mode: input.liveState.accessMode,
    visibility: input.liveState.visibility,
    guest_user: guestUserId,
    event_start_at: eventStartFromScheduleAt(input.liveState.scheduleAt),
    cover_ref: input.coverRef ?? undefined,
    performer_allocations: input.liveState.performerAllocations.map((allocation) => ({
      user: allocation.role === "host" ? input.hostUserId : allocation.userId.trim() || guestUserId,
      role: allocation.role,
      share_bps: Math.round(allocation.sharePct * 100),
    })),
    setlist: {
      status: "ready",
      items: input.liveState.setlistItems.map((item) => ({
        song_artifact_bundle: liveSetlistSongArtifactBundleId(item.declaredTrackId),
        source_asset_ref: liveSetlistSourceAssetRef(item.declaredTrackId),
        title: item.titleText.trim(),
        artist: item.artistText?.trim() || undefined,
        rights_basis: liveRightsBasisFromPerformanceKind(item.performanceKind),
        rights_status: "pending",
      })),
    },
  };
}

export async function submitLiveRoom({
  communityId,
  createLiveRoom,
  description,
  hostUserId,
  liveState,
  paidLiveRoomPriceUsd,
  pricingPolicyRegionalPricingEnabled,
  publishLiveRoom,
  regionalPricingEnabled,
  title,
  uploadMedia,
}: {
  communityId: string;
  createLiveRoom: CreateLiveRoom;
  description: string;
  hostUserId: string | null | undefined;
  liveState: LiveComposerState;
  paidLiveRoomPriceUsd: number | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  publishLiveRoom: PublishLiveRoom;
  regionalPricingEnabled: boolean;
  title: string;
  uploadMedia: UploadLiveCoverMedia;
}): Promise<ApiLiveRoom> {
  if (!hostUserId) {
    throw new Error("Sign in before creating a live room.");
  }

  let coverRef: string | null = null;
  if (liveState.coverUpload) {
    const uploadedCover = await uploadMedia({
      kind: "post_image",
      file: liveState.coverUpload,
    });
    coverRef = uploadedCover.media_ref;
  }

  const roomRequest = buildLiveRoomRequest({
    coverRef,
    description,
    hostUserId,
    liveState,
    title,
  });

  if (liveState.accessMode !== "paid") {
    return await createLiveRoom(communityId, roomRequest);
  }

  const listingRequest = buildLiveRoomListingRequest({
    liveRoomId: null,
    paidLiveRoomPriceUsd,
    pricingPolicyRegionalPricingEnabled,
    regionalPricingEnabled,
  });
  if (!listingRequest) {
    throw new Error("Build a paid listing payload before publishing this live room.");
  }

  const published = await publishLiveRoom(communityId, {
    room: roomRequest,
    listing: listingRequest,
  });
  return published.room;
}
