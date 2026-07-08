"use client";

import type { PublicProfileResolution } from "@pirate/api-contracts";
import type {
  ApiCreateLiveRoomRequest,
  ApiLiveRoom,
  ApiLiveRoomRightsBasis,
  ApiPublishLiveRoomRequest,
  ApiPublishLiveRoomResponse,
} from "@/lib/api/client-api-types";
import type {
  AnonymousIdentityScope,
  IdentityMode,
  LiveComposerState,
  LiveSetlistItemKind,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { buildLiveRoomListingRequest } from "@/app/authenticated-helpers/asset-submit";
import type { SubmitProgressReporter } from "./progress";

type UploadedLiveCoverMedia = {
  media_ref: string;
};

type UploadLiveCoverMedia = (
  input: { kind: "post_image"; file: File; onProgress?: (fraction: number) => void },
) => Promise<UploadedLiveCoverMedia>;

type CreateLiveRoom = (
  communityId: string,
  request: ApiCreateLiveRoomRequest,
) => Promise<ApiLiveRoom>;

type PublishLiveRoom = (
  communityId: string,
  request: ApiPublishLiveRoomRequest,
) => Promise<ApiPublishLiveRoomResponse>;

type ResolvePublicProfileByHandle = (handleLabel: string) => Promise<PublicProfileResolution>;

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

function eventStartFromLiveState(liveState: LiveComposerState): number | null {
  return liveState.scheduleForLater
    ? eventStartFromScheduleAt(liveState.scheduleAt)
    : null;
}

function liveSetlistSongArtifactBundleId(declaredTrackId: string | undefined): string | undefined {
  const value = declaredTrackId?.trim();
  return value?.startsWith("sab_") ? value : undefined;
}

function liveSetlistSourceAssetRef(declaredTrackId: string | undefined): string | undefined {
  const value = declaredTrackId?.trim();
  return value?.startsWith("story:asset:") ? value : undefined;
}

function publicAssetIdFromReferenceId(referenceId: string | undefined): string | null {
  const value = referenceId?.trim();
  if (!value) return null;
  if (value.startsWith("story:asset:")) {
    const assetRef = value.slice("story:asset:".length);
    return assetRef.startsWith("asset_") ? assetRef : `asset_${assetRef}`;
  }
  if (value.startsWith("asset_")) return value;
  return null;
}

function buildLiveRoomAudienceGate(liveState: LiveComposerState): ApiCreateLiveRoomRequest["audience_gate"] {
  if (liveState.accessMode !== "gated") return undefined;
  const targetRefs = Array.from(new Set((liveState.audienceGateTargetRefs ?? [])
    .map((targetRef) => publicAssetIdFromReferenceId(targetRef) ?? targetRef.trim())
    .filter((targetRef) => targetRef.startsWith("asset_"))));
  if (liveState.audienceGateMode === "purchase_entitlement" && targetRefs.length > 0) {
    return {
      version: 1,
      match: "any",
      segments: [{
        type: "purchase_entitlement",
        entitlement_kind: "asset_access",
        target_refs: targetRefs,
      }],
    };
  }
  if (liveState.audienceGateMode === "purchase_entitlement") {
    throw new Error("Select at least one catalog song for buyer access.");
  }
  return {
    version: 1,
    match: "any",
    segments: [{ type: "community_members" }],
  };
}

function isPirateUserId(value: string): boolean {
  return value.startsWith("usr_");
}

function normalizeLiveRoomGuestHandle(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/^\/?u\//, "");
}

export async function resolveLiveRoomGuestUserId(input: {
  guestUserId?: string | null;
  resolveProfileByHandle?: ResolvePublicProfileByHandle;
}): Promise<string | null> {
  const rawGuestUserId = input.guestUserId?.trim();
  if (!rawGuestUserId) return null;
  if (isPirateUserId(rawGuestUserId)) return rawGuestUserId;

  const handleLabel = normalizeLiveRoomGuestHandle(rawGuestUserId);
  if (!handleLabel) return null;
  if (!input.resolveProfileByHandle) {
    throw new Error("Choose a Pirate profile for the cohost before creating a duet live room.");
  }

  let resolution: PublicProfileResolution;
  try {
    resolution = await input.resolveProfileByHandle(handleLabel);
  } catch {
    throw new Error(`Could not find a Pirate user for "${rawGuestUserId}".`);
  }

  const resolvedUserId = resolution.profile.id.trim();
  if (!isPirateUserId(resolvedUserId)) {
    throw new Error(`The cohost "${rawGuestUserId}" did not resolve to a Pirate user id.`);
  }
  return resolvedUserId;
}

function performerAllocationsFromLiveState(input: {
  guestUserId: string | null;
  hostUserId: string;
  liveState: LiveComposerState;
}): ApiCreateLiveRoomRequest["performer_allocations"] {
  if (input.liveState.accessMode !== "paid") return undefined;

  return input.liveState.performerAllocations.map((allocation) => ({
    user: allocation.role === "host" ? input.hostUserId : input.guestUserId,
    role: allocation.role,
    share_bps: Math.round(allocation.sharePct * 100),
  }));
}

export function buildLiveRoomRequest(input: {
  anonymousScope?: AnonymousIdentityScope;
  coverRef?: string | null;
  description: string;
  disclosedQualifierIds?: string[];
  hostUserId: string;
  identityMode?: IdentityMode;
  liveState: LiveComposerState;
  resolvedGuestUserId?: string | null;
  title: string;
}): ApiCreateLiveRoomRequest {
  const identityMode = input.identityMode ?? "public";
  const rawGuestUserId = input.liveState.guestUserId?.trim() || null;
  const guestUserId = input.liveState.roomKind === "duet"
    ? input.resolvedGuestUserId ?? rawGuestUserId
    : null;
  const storeUrl = input.liveState.storeUrl?.trim();
  const storeLabel = input.liveState.storeLabel?.trim();
  const audienceGate = buildLiveRoomAudienceGate(input.liveState);
  return {
    title: input.title.trim(),
    anonymous_scope: identityMode === "anonymous" ? input.anonymousScope : undefined,
    description: input.description.trim() || undefined,
    disclosed_qualifier_ids: identityMode === "anonymous" ? input.disclosedQualifierIds : undefined,
    identity_mode: identityMode,
    room_kind: input.liveState.roomKind,
    access_mode: input.liveState.accessMode,
    visibility: input.liveState.visibility,
    guest_user: guestUserId,
    event_start_at: eventStartFromLiveState(input.liveState),
    cover_ref: input.coverRef ?? undefined,
    ...(storeUrl ? { store_url: storeUrl } : {}),
    ...(storeLabel ? { store_label: storeLabel } : {}),
    ...(audienceGate ? { audience_gate: audienceGate } : {}),
    recording_enabled: input.liveState.recordingEnabled === true,
    performer_allocations: performerAllocationsFromLiveState({
      guestUserId,
      hostUserId: input.hostUserId,
      liveState: input.liveState,
    }),
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
  anonymousScope,
  communityId,
  createLiveRoom,
  description,
  disclosedQualifierIds,
  hostUserId,
  identityMode,
  liveState,
  paidLiveRoomPriceUsd,
  pricingPolicyRegionalPricingEnabled,
  publishLiveRoom,
  regionalPricingEnabled,
  reportProgress,
  resolveProfileByHandle,
  title,
  uploadMedia,
}: {
  anonymousScope?: AnonymousIdentityScope;
  communityId: string;
  createLiveRoom: CreateLiveRoom;
  description: string;
  disclosedQualifierIds?: string[];
  hostUserId: string | null | undefined;
  identityMode: IdentityMode;
  liveState: LiveComposerState;
  paidLiveRoomPriceUsd: number | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  publishLiveRoom: PublishLiveRoom;
  regionalPricingEnabled: boolean;
  reportProgress?: SubmitProgressReporter;
  resolveProfileByHandle?: ResolvePublicProfileByHandle;
  title: string;
  uploadMedia: UploadLiveCoverMedia;
}): Promise<ApiLiveRoom> {
  if (!hostUserId) {
    throw new Error("Sign in before creating a live room.");
  }

  const resolvedGuestUserId = liveState.roomKind === "duet"
    ? await resolveLiveRoomGuestUserId({
      guestUserId: liveState.guestUserId,
      resolveProfileByHandle,
    })
    : null;

  let coverRef: string | null = null;
  if (liveState.coverUpload) {
    // Report the media step right before the actual upload, not before the call —
    // otherwise the button jumps to "Publishing" while the cover is still uploading.
    reportProgress?.("prepare_media");
    const uploadedCover = await uploadMedia({
      kind: "post_image",
      file: liveState.coverUpload,
      onProgress: (fraction) => {
        reportProgress?.("prepare_media", `${Math.round(fraction * 100)}%`);
      },
    });
    coverRef = uploadedCover.media_ref;
  }

  const roomRequest = buildLiveRoomRequest({
    anonymousScope,
    coverRef,
    description,
    disclosedQualifierIds,
    hostUserId,
    identityMode,
    liveState,
    resolvedGuestUserId,
    title,
  });

  if (liveState.accessMode !== "paid") {
    reportProgress?.("publish_post");
    return await createLiveRoom(communityId, roomRequest);
  }

  reportProgress?.("create_listing");
  const listingRequest = buildLiveRoomListingRequest({
    liveRoomId: null,
    paidLiveRoomPriceUsd,
    pricingPolicyRegionalPricingEnabled,
    regionalPricingEnabled,
  });
  if (!listingRequest) {
    throw new Error("Build a paid listing payload before publishing this live room.");
  }

  reportProgress?.("publish_post");
  const published = await publishLiveRoom(communityId, {
    room: roomRequest,
    listing: listingRequest,
  });
  return published.room;
}
