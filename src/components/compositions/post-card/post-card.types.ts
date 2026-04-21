import type { ActionMenuItem } from "@/components/primitives/action-menu";

// Domain-aligned types from specs/domain/asset.md and specs/domain/post.md
export type AccessMode = "public" | "locked";
export type PublicationState = "draft" | "story_requested" | "story_published" | "story_failed";
export type SongMode = "original" | "remix";
export type RightsBasis = "none" | "original" | "derivative" | "attribution_only";
export type AnalysisState = "pending" | "allow" | "allow_with_required_reference" | "review_required" | "blocked";
export type ContentSafetyState = "pending" | "safe" | "sensitive" | "adult";
export type AgeGatePolicy = "none" | "18_plus";

// From specs/domain/marketplace.md
export type ListingMode = "not_listed" | "listed";
export type ListingStatus = "active" | "paused" | "sold_out" | "removed";

// Playback axis - purely UI state
export type PlaybackState = "idle" | "playing" | "paused" | "buffering" | "ended";

// Upstream attribution for remixes / derivatives (from specs/domain/asset.md)
export interface UpstreamAttribution {
  assetId: string;
  relationshipType: "remix_of" | "references_song" | "references_video" | "inspired_by" | "samples";
  title: string;
  artist?: string;
}

export type VideoMode = "original" | "reaction" | "clip" | "remix";

// Spec-aligned song content (from specs/domain/post.md, asset.md, marketplace.md)
export interface SongContentSpec {
  type: "song";
  // Core metadata
  title: string;
  artist?: string; // Optional - omit when same as post author to avoid redundancy
  artworkSrc?: string;
  durationLabel?: string;
  durationMs?: number;

  // Playback axis
  playbackState?: PlaybackState;
  progressMs?: number;

  // Domain axis - from specs/domain/asset.md and post.md
  accessMode: AccessMode;
  publicationState?: PublicationState;
  songMode?: SongMode;
  rightsBasis?: RightsBasis;
  analysisState?: AnalysisState;
  contentSafetyState?: ContentSafetyState;
  ageGatePolicy?: AgeGatePolicy;
  ageGateViewerState?: "proof_required" | "verified_blocked";
  upstreamAttributions?: UpstreamAttribution[];

  // Commerce axis - from specs/domain/marketplace.md
  listingMode?: ListingMode;
  listingStatus?: ListingStatus;
  priceLabel?: string;
  regionalPriceLabel?: string;
  hasEntitlement?: boolean; // Derived from purchase/ownership state

  // Callbacks
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (ms: number) => void;
  onUnlock?: () => void;
  onBuy?: () => void;
  onVerifyAge?: () => void;
}

export interface VideoContentSpec {
  type: "video";

  src: string;
  posterSrc?: string;
  title?: string;
  durationLabel?: string;
  durationMs?: number;

  playbackState?: PlaybackState;
  progressMs?: number;

  accessMode: AccessMode;
  publicationState?: PublicationState;
  videoMode?: VideoMode;
  rightsBasis?: RightsBasis;
  analysisState?: AnalysisState;
  contentSafetyState?: ContentSafetyState;
  ageGatePolicy?: AgeGatePolicy;
  ageGateViewerState?: "proof_required" | "verified_blocked";
  upstreamAttributions?: UpstreamAttribution[];

  listingMode?: ListingMode;
  listingStatus?: ListingStatus;
  priceLabel?: string;
  regionalPriceLabel?: string;
  hasEntitlement?: boolean;

  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (ms: number) => void;
  onUnlock?: () => void;
  onBuy?: () => void;
  onVerifyAge?: () => void;
}

export type PostCardContent =
  | {
      type: "text";
      body: string;
      bodyDir?: "ltr" | "rtl" | "auto";
      bodyLang?: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      captionDir?: "ltr" | "rtl" | "auto";
      captionLang?: string;
      aspectRatio?: number;
    }
  | VideoContentSpec
  | {
      type: "link";
      href: string;
      linkTitle?: string;
      linkTitleDir?: "ltr" | "rtl" | "auto";
      linkTitleLang?: string;
      linkLabel?: string;
      linkCaption?: string;
      linkCaptionDir?: "ltr" | "rtl" | "auto";
      linkCaptionLang?: string;
      previewImageSrc?: string;
    }
  | SongContentSpec;

export type PostCardMenuItem = ActionMenuItem;

export type PostCardIdentity = {
  kind: "community" | "user";
  label: string;
  href?: string;
  avatarSrc?: string;
};

export type PostCardAgentAuthor = {
  label: string;
  href?: string;
  ownerLabel: string;
  ownerHref?: string;
};

export type PostCardByline = {
  community?: PostCardIdentity;
  author?: PostCardIdentity;
  agentAuthor?: PostCardAgentAuthor;
  timestampLabel: string;
};

export type PostCardViewContext = "home" | "community" | "profile";
export type PostCardIdentityPresentation =
  | "author_primary"
  | "author_with_community"
  | "community_primary"
  | "anonymous_primary"
  | "anonymous_with_community";

export type PostCardEngagement = {
  score: number;
  viewerVote?: "up" | "down" | null;
  commentCount: number;
  saved?: boolean;
  unlock?: {
    label: string;
    onBuy: () => void;
  };
};

export interface PostCardProps {
  viewContext?: PostCardViewContext;
  identityPresentation?: PostCardIdentityPresentation;
  byline: PostCardByline;
  qualifierLabels?: string[];
  title?: string;
  titleDir?: "ltr" | "rtl" | "auto";
  titleLang?: string;
  titleHref?: string;
  postHref?: string;
  content: PostCardContent;
  engagement: PostCardEngagement;
  menuItems?: PostCardMenuItem[];
  onVote?: (direction: "up" | "down" | null) => void;
  onComment?: () => void;
  onShare?: () => void;
  onMenuAction?: (key: string) => void;
  className?: string;
}
