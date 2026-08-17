// Pure live-room card derivation, ported from the React
// post-card-live-room-content.tsx. Copy travels through LiveRoomLabels so the
// derivation stays renderer- and locale-free.

import type { LiveRoomContentSpec, LiveRoomParticipant } from "./types";

export type LiveRoomUiState =
  | { kind: "can_watch"; cta: string; onClick?: () => void }
  | { kind: "can_watch_replay"; cta: string; onClick?: () => void }
  | { kind: "needs_access"; cta: string; onClick?: () => void }
  | { kind: "needs_owned_song"; cta: string; onClick: () => void }
  | { kind: "owned_song_unavailable" }
  | { kind: "needs_ticket"; cta: string; onClick?: () => void }
  | { kind: "has_ticket" }
  | { kind: "can_rsvp"; cta: string; onClick?: () => void }
  | { kind: "rsvped" }
  | { kind: "needs_verification"; cta: string; onClick?: () => void }
  | { kind: "tickets_unavailable" }
  | { kind: "replay_processing" }
  | { kind: "replay_review_pending" }
  | { kind: "replay_failed" }
  | { kind: "scheduled" }
  | { kind: "ended" }
  | { kind: "canceled" };

export interface LiveRoomLabels {
  canceled: string;
  ended: string;
  endedAgo: (time: string) => string;
  startsAt: (time: string) => string;
  buy: string;
  buyForPrice: (price: string) => string;
  watchReplay: string;
  verifyToAttend: string;
  buySongToWatch: string;
  buySongToWatchForPrice: (price: string) => string;
  verifyAccess: string;
  getTicket: string;
  getTicketForPrice: (price: string) => string;
  watchLive: string;
  rsvp: string;
  host: string;
  with: string;
  hostedBy: string;
  acceptInvite: string;
  openInvite: string;
  producerInviteHint: string;
  producerInviteRevoked: string;
  startBroadcast: string;
  openProducerRoom: string;
  agentCheckout: string;
}

export const defaultLiveRoomLabels: LiveRoomLabels = {
  canceled: "Canceled",
  ended: "Ended",
  endedAgo: (time) => `Ended ${time}`,
  startsAt: (time) => `Starts ${time}`,
  buy: "Buy",
  buyForPrice: (price) => `Buy · ${price}`,
  watchReplay: "Watch replay",
  verifyToAttend: "Verify to attend",
  buySongToWatch: "Buy the song to watch",
  buySongToWatchForPrice: (price) => `Buy the song to watch · ${price}`,
  verifyAccess: "Verify access",
  getTicket: "Get ticket",
  getTicketForPrice: (price) => `Get ticket · ${price}`,
  watchLive: "Watch live",
  rsvp: "RSVP",
  host: "Host",
  with: "with",
  hostedBy: "Hosted by",
  acceptInvite: "Accept invite",
  openInvite: "Open invite",
  producerInviteHint: "You were invited to join this live room as a guest.",
  producerInviteRevoked: "Your guest invite was revoked.",
  startBroadcast: "Start broadcast",
  openProducerRoom: "Open producer room",
  agentCheckout: "Agent checkout",
};

export function liveRoomAgeProofRequired(content: LiveRoomContentSpec): boolean {
  return content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
}

function priceLabel(content: LiveRoomContentSpec): string | null {
  return content.regionalPriceLabel ?? content.priceLabel ?? null;
}

export function liveRoomTimeLabel(
  content: LiveRoomContentSpec,
  labels: LiveRoomLabels = defaultLiveRoomLabels,
): string | null {
  if (content.status === "live") return null;
  if (content.status === "canceled") return labels.canceled;
  if (content.status === "ended") {
    if (!content.endedAtLabel) return labels.ended;
    if (content.endedAtLabel.endsWith("ago")) return `${labels.ended} ${content.endedAtLabel}`;
    return labels.endedAgo(content.endedAtLabel);
  }
  return content.startsAtLabel ? labels.startsAt(content.startsAtLabel) : null;
}

export function hasReplaySurface(content: LiveRoomContentSpec): boolean {
  return content.status === "ended"
    && Boolean(content.replayStatus && content.replayStatus !== "none");
}

export function liveRoomParticipantsLabel(
  participants: LiveRoomParticipant[] | undefined,
  labels: LiveRoomLabels = defaultLiveRoomLabels,
): string | null {
  if (!participants || participants.length === 0) return null;
  const guests = participants.filter((p) => p.role === "guest");
  if (guests.length === 0) return null;
  const host = participants.find((p) => p.role === "host");
  const hostLabel = host?.label ?? labels.host;
  const extraCount = guests.length - 1;
  if (extraCount > 0) return `${hostLabel} ${labels.with} ${guests[0]!.label} + ${extraCount}`;
  return `${hostLabel} ${labels.with} ${guests[0]!.label}`;
}

export function deriveLiveRoomUi(
  content: LiveRoomContentSpec,
  labels: LiveRoomLabels = defaultLiveRoomLabels,
): LiveRoomUiState {
  const ageProofRequired = liveRoomAgeProofRequired(content);
  const price = priceLabel(content);

  if (content.status === "canceled") {
    return { kind: "canceled" };
  }

  if (content.status === "ended" || content.accessState === "ended") {
    if (content.replayStatus === "published") {
      if (content.accessMode === "paid" && !content.hasEntitlement) {
        return {
          kind: "needs_ticket",
          cta: price ? labels.buyForPrice(price) : labels.buy,
          onClick: content.onBuy,
        };
      }
      return { kind: "can_watch_replay", cta: labels.watchReplay, onClick: content.onWatch };
    }
    if (content.replayStatus === "processing") {
      return { kind: "replay_processing" };
    }
    if (content.replayStatus === "review_pending") {
      return { kind: "replay_review_pending" };
    }
    if (content.replayStatus === "failed") {
      return { kind: "replay_failed" };
    }
    return { kind: "ended" };
  }

  if (ageProofRequired) {
    return {
      kind: "needs_verification",
      cta: labels.verifyToAttend,
      onClick: content.onVerifyAge,
    };
  }

  if (content.accessState === "missing_listing") {
    return { kind: "tickets_unavailable" };
  }

  if (content.accessState === "gate_required") {
    if (content.onGatePurchase) {
      return {
        kind: "needs_owned_song",
        cta: content.gatePurchaseLabel ? labels.buySongToWatchForPrice(content.gatePurchaseLabel) : labels.buySongToWatch,
        onClick: content.onGatePurchase,
      };
    }
    if (content.gateOwnershipRequired) {
      return { kind: "owned_song_unavailable" };
    }
    return {
      kind: "needs_access",
      cta: labels.verifyAccess,
      onClick: content.onWatch,
    };
  }

  if (content.accessState === "purchase_required" || (content.accessMode === "paid" && !content.hasEntitlement)) {
    return {
      kind: "needs_ticket",
      cta: price ? labels.getTicketForPrice(price) : labels.getTicket,
      onClick: content.onBuy,
    };
  }

  if (content.accessMode === "paid" && content.hasEntitlement) {
    if (content.status === "live") {
      return { kind: "can_watch", cta: labels.watchLive, onClick: content.onWatch };
    }
    return { kind: "has_ticket" };
  }

  if (
    content.status === "scheduled"
    && content.accessMode === "free"
    && !content.producerRole
    && (content.accessState === "waiting" || content.accessState === "allowed" || !content.accessState)
  ) {
    if (content.rsvpState === "going") return { kind: "rsvped" };
    if (content.onRsvp) return { kind: "can_rsvp", cta: labels.rsvp, onClick: content.onRsvp };
  }

  if (content.status === "live" && !content.accessState && !content.producerRole) {
    return { kind: "scheduled" };
  }

  if (content.status === "live") {
    return { kind: "can_watch", cta: labels.watchLive, onClick: content.onWatch };
  }

  return { kind: "scheduled" };
}

export function liveRoomShouldShowCta(ui: LiveRoomUiState): ui is Extract<LiveRoomUiState, { cta: string }> {
  return "cta" in ui && Boolean(ui.cta);
}

export function liveRoomHasPostPageMeta(
  content: LiveRoomContentSpec,
  ui: LiveRoomUiState,
  time: string | null,
): boolean {
  return Boolean(
    time
    || content.replayDurationLabel
    || content.attendeeCountLabel
    || ui.kind === "has_ticket"
    || ui.kind === "rsvped"
    || ui.kind === "replay_processing"
    || ui.kind === "replay_review_pending"
    || ui.kind === "replay_failed"
    || ui.kind === "owned_song_unavailable",
  );
}

