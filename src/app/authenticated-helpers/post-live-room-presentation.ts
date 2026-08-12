import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type {
  LiveRoomContentSpec,
  PostCardProps,
} from "@/components/compositions/posts/post-card/post-card.types";
import type { LiveRoomPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { sameUserId } from "@/app/authenticated-helpers/user-id";

function formatLiveRoomTimestampLabel(value: number | null | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  const label = formatRelativeTimestamp(value);
  return label || undefined;
}

function normalizeReplayStatus(value: string | null | undefined): LiveRoomContentSpec["replayStatus"] {
  if (
    value === "none"
    || value === "processing"
    || value === "review_pending"
    || value === "published"
    || value === "failed"
  ) return value;
  return "none";
}

function renderableImageRef(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("/")
    || trimmed.startsWith("http://")
    || trimmed.startsWith("https://")
    || trimmed.startsWith("blob:")
    || trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return undefined;
}

function firstPurchaseGateSegment(gate: NonNullable<NonNullable<LiveRoomPresentationOptions["access"]>["access"]["gate"]>) {
  return gate.failed_segments.find((segment) => segment.type === "purchase_entitlement");
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
    : liveAccess?.decision_reason === "membership_required" || liveAccess?.decision_reason === "gate_unsatisfied"
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
  const purchaseGateSegment = liveAccess?.gate ? firstPurchaseGateSegment(liveAccess.gate) : undefined;
  const gatePurchaseListing = purchaseGateSegment?.purchasable_listings?.[0];
  const accessMode = liveRoom?.access_mode ?? liveAccess?.access_mode ?? (listing ? "paid" : "free");
  const viewerOwnsPost = sameUserId(post.author_user, input.liveRoom?.currentUserId);
  const coverSrc = renderableImageRef(liveRoom?.cover_ref)
    ?? renderableImageRef(input.primaryMedia?.poster_ref)
    ?? renderableImageRef(input.primaryMedia?.storage_ref);

  return {
    type: "live_room",
    accessMode,
    accessState,
    ageGatePolicy: post.age_gate_policy,
    anchorPostHref: `/p/${post.id}`,
    contentSafetyState: post.content_safety_state,
    coverSrc,
    description: liveRoom?.description ?? input.resolvedCaption,
    endedAtLabel: formatLiveRoomTimestampLabel(liveRoom?.ended_at),
    freedomDetected: input.liveRoom?.freedomDetected,
    freedomHref: input.liveRoom?.freedomHref,
    gateOwnershipRequired: Boolean(purchaseGateSegment),
    gatePurchaseLabel: gatePurchaseListing
      ? formatUsdLabel(centsToUsd(gatePurchaseListing.price_cents), input.liveRoom?.localeTag)
      : undefined,
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
    onAcceptGuestInvite: input.liveRoom?.onAcceptGuestInvite,
    onBuy: input.liveRoom?.onBuy,
    onGatePurchase: gatePurchaseListing ? input.liveRoom?.onGatePurchase : undefined,
    onReviewReplay: input.liveRoom?.onReviewReplay,
    onVerifyAge: input.onVerifyAge,
    onViewerRenew: input.liveRoom?.onViewerRenew,
    onWatch: input.liveRoom?.onWatch,
    participants: input.liveRoom?.participants,
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
    viewerAttachResponse: input.liveRoom?.viewerAttachResponse ?? null,
  };
}
