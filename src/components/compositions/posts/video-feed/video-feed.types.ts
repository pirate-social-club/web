export type VideoFeedCapability = "ready" | "locked" | "unavailable";

export interface VideoFeedItem {
  /** Server-stated booking availability for this item's publisher. */
  booking?: {
    /** Compact display price, such as "$35". */
    priceLabel?: string;
  };
  /** Server-stated eligibility for funding this item's linked song. */
  boostEligibility?: "eligible" | "unavailable";
  id: string;
  publisher: {
    avatarSrc?: string;
    handle: string;
    kind: "community" | "profile";
  };
  caption?: string;
  commentCount: number;
  interactionGate?: "open" | "membership_required";
  karaoke: VideoFeedCapability;
  likeCount: number;
  liked?: boolean;
  media: {
    orientation: "portrait" | "landscape";
    posterSrc: string;
    src?: string;
  };
  /** Server-stated, action-specific earning opportunities for the linked song. */
  rewards?: {
    karaoke?: { amountLabel?: string };
    study?: { amountLabel?: string };
  };
  song?: {
    artist: string;
    karaokeHref?: string;
    sourcePostId?: string;
    studyHref?: string;
    title: string;
  };
  study: VideoFeedCapability;
  viewerState?: "allowed" | "age_proof_required";
}
