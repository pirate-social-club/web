import type { PostCardShareAction } from "@/components/compositions/posts/post-card/post-card.types";

export type VideoFeedCapability = "ready" | "locked" | "processing" | "failed" | "unavailable";

export interface VideoFeedItem {
  /** Server-stated booking availability for this item's publisher. */
  booking?: {
    basePriceCents: number;
    currency: "USDC";
    hasAvailableSlot: boolean;
    hostUserId: string;
    startingPriceCents: number | null;
  };
  /** Server-stated eligibility for funding this item's linked song. */
  boostEligibility?: "eligible" | "unavailable";
  /** Owning community, when known. Used for analytics attribution and as the booking attribution authority for feed-opened bookings. */
  communityId?: string;
  id: string;
  publisher: {
    avatarSrc?: string;
    handle: string;
    /** Canonical profile or community destination for both publisher identity affordances. */
    href?: string;
    kind: "community" | "profile";
    relationship?:
      | {
        kind: "follow";
        ownProfile: boolean;
        targetUserId: string;
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
  captionDir?: "ltr" | "rtl" | "auto";
  captionLang?: string;
  commentCount: number;
  interactionGate?: "open" | "membership_required";
  karaoke: VideoFeedCapability;
  /** Viewer-specific access to learning actions for the linked song. */
  learningGate?: "allowed" | "age_proof_required";
  /** Viewer has downvoted. Surfaced in the overflow menu, never as a rail action. */
  downvoted?: boolean;
  likeCount: number;
  liked?: boolean;
  media: {
    orientation: "portrait" | "landscape";
    posterSrc?: string;
    src?: string;
  };
  shareActions?: PostCardShareAction[];
  /** Alternate authored caption when the API supplied a translated presentation. */
  translation?: {
    originalCaption: string;
    originalDir?: "ltr" | "rtl" | "auto";
    originalLang?: string;
    showOriginalLabel: string;
    showTranslationLabel: string;
  };
  /** Server-stated, action-specific earning opportunities for the linked song. */
  rewards?: {
    karaoke?: { amountLabel?: string };
    study?: { amountLabel?: string };
  };
  song?: {
    artworkSrc?: string;
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
