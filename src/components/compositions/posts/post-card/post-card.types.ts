import type { ActionMenuItem } from "@/components/primitives/action-menu";
import type { CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

// Domain-aligned types from specs/domain/asset.md and specs/domain/post.md
export type AccessMode = "public" | "locked";
export type PublicationState = "draft" | "story_requested" | "story_published" | "story_failed";
export type SongMode = "original" | "remix";
export type RightsBasis = "none" | "original" | "derivative" | "attribution_only";
export type AnalysisState = "pending" | "allow" | "allow_with_required_reference" | "review_required" | "blocked";
export type ContentSafetyState = "pending" | "safe" | "sensitive" | "adult";
export type AgeGatePolicy = CommunityDefaultAgeGatePolicy;

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
      body?: string;
      bodyDir?: "ltr" | "rtl" | "auto";
      bodyLang?: string;
      previewTitle?: string;
      previewTitleDir?: "ltr" | "rtl" | "auto";
      previewTitleLang?: string;
      linkLabel?: string;
      previewImageSrc?: string;
    }
  | {
      type: "embed";
      provider: "x" | "youtube";
      state: "pending" | "preview" | "embed" | "unavailable";
      renderMode: "preview" | "official";
      canonicalUrl: string;
      originalUrl?: string;
      body?: string;
      bodyDir?: "ltr" | "rtl" | "auto";
      bodyLang?: string;
      preview?: {
        authorName?: string | null;
        authorUrl?: string | null;
        text?: string | null;
        hasMedia?: boolean | null;
        mediaUrl?: string | null;
        createdAt?: string | null;
        title?: string | null;
        thumbnailUrl?: string | null;
        thumbnailWidth?: number | null;
        thumbnailHeight?: number | null;
      } | null;
      oembedHtml?: string | null;
    }
  | SongContentSpec;

export type PostCardMenuItem = ActionMenuItem;

export type PostCardIdentity = {
  kind: "community" | "user";
  label: string;
  href?: string;
  avatarSeed?: string;
  avatarSrc?: string;
  verificationStatus?: "unverified";
};

export type PostCardAgentAuthor = {
  label: string;
  href?: string;
  ownerLabel: string;
  ownerHref?: string;
};

export type CommunityAuthorRole = "owner" | "moderator";

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
  | "community_with_author"
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
  authorCommunityRole?: CommunityAuthorRole | null;
  authorNationalityBadgeCountry?: string | null;
  authorNationalityBadgeLabel?: string;
  qualifierLabels?: string[];
  title?: string;
  titleDir?: "ltr" | "rtl" | "auto";
  titleLang?: string;
  titleHref?: string;
  postHref?: string;
  content: PostCardContent;
  sourceLanguage?: string | null;
  isViewingOriginal?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  engagement: PostCardEngagement;
  menuItems?: PostCardMenuItem[];
  onVote?: (direction: "up" | "down" | null) => void;
  onComment?: () => void;
  onShare?: () => void;
  onToggleOriginal?: () => void;
  onMenuAction?: (key: string) => void;
  className?: string;
}
