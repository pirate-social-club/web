import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type {
  LiveRoomContentSpec,
  PostCardProps,
} from "@/components/compositions/posts/post-card/post-card.types";
import type { LiveRoomPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import { formatRelativeTimestamp } from "@/lib/formatting/time";

function formatLiveRoomTimestampLabel(value: number | null | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  const label = formatRelativeTimestamp(value);
  return label || undefined;
}

function normalizeReplayStatus(value: string | null | undefined): LiveRoomContentSpec["replayStatus"] {
  if (value === "none" || value === "processing" || value === "ready" || value === "failed") return value;
  return "none";
}

export function toLiveRoomPostContent(
  postResponse: ApiPost,
  input: {
    liveRoom?: LiveRoomPresentationOptions;
    onVerifyAge?: () => void;
    primaryMedia?: NonNullable<ApiPost["post"]["media_refs"]>[number];
    resolvedCaption?: string;
    title: string;
  },
): PostCardProps["content"] {
  const { post } = postResponse;
  const liveRoom = input.liveRoom?.access?.room;
  const liveAccess = input.liveRoom?.access?.access;
  const publicStatus = post.anchor_live_room_status ?? undefined;
  const accessState: LiveRoomContentSpec["accessState"] = liveAccess?.decision_reason === "purchase_required"
    ? liveAccess.listing ? "purchase_required" : "missing_listing"
    : liveAccess?.decision_reason === "membership_required"
      ? "gate_required"
      : liveAccess?.decision_reason === "ended" || liveAccess?.decision_reason === "canceled"
        ? "ended"
        : liveAccess?.decision_reason === "not_live"
          ? "waiting"
          : liveAccess?.allowed
            ? "allowed"
            : undefined;
  const listing = input.liveRoom?.listing;
  const purchase = input.liveRoom?.purchase;
  const accessMode = liveRoom?.access_mode ?? liveAccess?.access_mode ?? (listing ? "paid" : "free");
  const viewerOwnsPost = Boolean(input.liveRoom?.currentUserId && post.author_user === input.liveRoom.currentUserId);

  return {
    type: "live_room",
    accessMode,
    accessState,
    ageGatePolicy: post.age_gate_policy,
    anchorPostHref: `/p/${post.id}`,
    contentSafetyState: post.content_safety_state,
    coverSrc: liveRoom?.cover_ref ?? input.primaryMedia?.poster_ref ?? input.primaryMedia?.storage_ref ?? undefined,
    description: liveRoom?.description ?? input.resolvedCaption,
    endedAtLabel: formatLiveRoomTimestampLabel(liveRoom?.ended_at),
    freedomDetected: input.liveRoom?.freedomDetected,
    freedomHref: input.liveRoom?.freedomHref,
    guestInviteStatus: input.liveRoom?.guestInviteStatus ?? null,
    hasEntitlement: accessMode !== "paid" || liveAccess?.allowed === true || Boolean(purchase) || viewerOwnsPost,
    liveRoomId: post.anchor_live_room ?? "",
    liveSinceLabel: formatLiveRoomTimestampLabel(liveRoom?.live_started_at),
    listingMode: listing || liveAccess?.listing ? "listed" : "not_listed",
    listingStatus: listing?.status === "active"
      ? "active"
      : listing?.status === "paused"
      ? "paused"
      : undefined,
    onBuy: input.liveRoom?.onBuy,
    onVerifyAge: input.onVerifyAge,
    onWatch: input.liveRoom?.onWatch,
    priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), input.liveRoom?.localeTag) : undefined,
    producerRole: input.liveRoom?.producerRole ?? null,
    replayStatus: normalizeReplayStatus(liveRoom?.replay_status),
    roomKind: liveRoom?.room_kind,
    setlistPreview: liveRoom?.setlist.items.slice(0, 3).map((item) => ({
      artist: item.artist ?? undefined,
      rightsStatus: item.rights_status,
      title: item.title,
    })),
    startsAtLabel: formatLiveRoomTimestampLabel(liveRoom?.event_start_at),
    status: liveRoom?.status ?? publicStatus ?? "scheduled",
    title: liveRoom?.title ?? input.title,
    visibility: liveRoom?.visibility ?? liveAccess?.visibility,
  };
}
