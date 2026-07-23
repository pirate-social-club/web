export type VideoFeedCapability = "ready" | "locked" | "unavailable";

export interface VideoFeedItem {
  /** Server-stated booking availability for this item's publisher. */
  booking?: {
    basePriceCents: number;
    currency: "USDC";
    hostUserId: string;
    startingPriceCents: number;
  };
  /** Server-stated eligibility for funding this item's linked song. */
  boostEligibility?: "eligible" | "unavailable";
  /** Owning community, when known. Used for analytics attribution rather than panel behavior. */
  communityId?: string;
  id: string;
  publisher: {
    avatarSrc?: string;
    handle: string;
    kind: "community" | "profile";
    relationship?:
      | {
        kind: "follow";
        ownProfile: boolean;
        targetWalletAddress: string;
      }
      | {
        active: boolean;
        disabled?: boolean;
        kind: "join";
        label: string;
        pending?: boolean;
      };
  };
  caption?: string;
  commentCount: number;
  interactionGate?: "open" | "membership_required";
  karaoke: VideoFeedCapability;
  /** Viewer has downvoted. Surfaced in the overflow menu, never as a rail action. */
  downvoted?: boolean;
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
    /** Canonical destination for the source song/post. */
    songHref?: string;
    sourcePostId?: string;
    studyHref?: string;
    title: string;
  };
  study: VideoFeedCapability;
  viewerState?: "allowed" | "age_proof_required";
}
