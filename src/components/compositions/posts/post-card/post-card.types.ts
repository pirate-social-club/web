import type { ActionMenuItem } from "@/components/primitives/action-menu";
import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import type { CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

// Domain-aligned types from specs/domain/asset.md and specs/domain/post.md
export type AccessMode = "public" | "locked";
export type PublicationState = "draft" | "story_requested" | "story_published" | "story_failed";
export type SongMode = "original" | "remix";
export type RightsBasis = "none" | "original" | "derivative" | "attribution_only" | "licensed_performance";
export type AnalysisState = "pending" | "allow" | "allow_with_required_reference" | "review_required" | "blocked";
export type ContentSafetyState = "pending" | "safe" | "sensitive" | "adult";
export type AgeGatePolicy = CommunityDefaultAgeGatePolicy;

// From specs/domain/marketplace.md
export type ListingMode = "not_listed" | "listed";
export type ListingStatus = "active" | "paused" | "sold_out" | "removed";
export type VinylReleaseProvider = "elasticstage";

export type DownloadPolicy = "stream_only" | "free_download" | "purchased_download";
export type StemKind = "instrumental" | "vocals" | "drums" | "bass" | "other";
export type StemAccessPolicy = "inherit" | "free" | "purchasers_only" | "unavailable";

export interface VinylReleaseSpec {
  available: boolean;
  provider: VinylReleaseProvider;
  url?: string | null;
}

export interface StemSpec {
  kind: StemKind;
  label?: string;
  durationLabel?: string;
  durationMs?: number;
  accessPolicy: StemAccessPolicy;
  onDownload?: () => void;
}

export interface SongStorageProof {
  cid: string;
  gatewayUrl: string;
  encrypted?: boolean;
}

export interface SongStorageProofs {
  original?: SongStorageProof;
  preview?: SongStorageProof;
  encryptedOriginal?: SongStorageProof;
}

// Playback axis - purely UI state
export type PlaybackState = "idle" | "playing" | "paused" | "buffering" | "ended";

// Upstream attribution for remixes / derivatives (from specs/domain/asset.md)
export interface UpstreamAttribution {
  assetId: string;
  relationshipType: "remix_of" | "references_song" | "references_video" | "inspired_by" | "samples";
  title: string;
  artist?: string;
  href?: string;
}

export type StoryRegistrationState = "registered" | "pending" | "failed";

export interface StoryRegistrationStatus {
  state: StoryRegistrationState;
  label: string;
  description?: string;
}

export interface StoryLicenseNotice {
  label: string;
  description?: string;
}

export type VideoMode = "original" | "reaction" | "clip" | "remix";
export type LiveRoomStatus = "scheduled" | "live" | "ended" | "canceled";
export type LiveRoomKind = "solo" | "duet";
export type LiveRoomAccessMode = "free" | "gated" | "paid";
export type LiveRoomVisibility = "public" | "unlisted";
export type LiveRoomAccessState =
  | "allowed"
  | "gate_required"
  | "purchase_required"
  | "waiting"
  | "missing_listing"
  | "ended";

export type LiveRoomReplayStatus = "none" | "processing" | "ready" | "failed";

export type LiveRoomProducerRole = "host" | "guest" | null;
export type LiveRoomRsvpState = "none" | "going";

export type LiveRoomParticipant = {
  role: "host" | "guest";
  label: string;
  href?: string;
  avatarSrc?: string;
};

export interface LiveRoomContentSpec {
  type: "live_room";
  liveRoomId: string;
  title: string;
  description?: string;
  coverSrc?: string;
  roomKind?: LiveRoomKind;
  status: LiveRoomStatus;
  accessMode: LiveRoomAccessMode;
  visibility?: LiveRoomVisibility;
  accessState?: LiveRoomAccessState;
  replayStatus?: LiveRoomReplayStatus;
  startsAtLabel?: string;
  liveSinceLabel?: string;
  endedAtLabel?: string;
  concertHref?: string;
  anchorPostHref?: string;
  shareUrl?: string;
  attendeeCountLabel?: string;
  rsvpState?: LiveRoomRsvpState;
  setlistPreview?: Array<{
    title: string;
    artist?: string;
    rightsStatus?: "pending" | "ready" | "blocked";
  }>;
  setlistTotalCount?: number;
  setlistHref?: string;
  listingMode?: ListingMode;
  listingStatus?: ListingStatus;
  priceLabel?: string;
  regionalPriceLabel?: string;
  hasEntitlement?: boolean;
  ageGatePolicy?: AgeGatePolicy;
  contentSafetyState?: ContentSafetyState;
  ageGateViewerState?: "proof_required" | "verified_allowed";
  agentPurchaseUrl?: string;
  agentPurchaseLabel?: string;
  producerRole?: LiveRoomProducerRole;
  freedomHref?: string;
  freedomDetected?: boolean;
  guestInviteStatus?: "pending" | "accepted" | "revoked" | null;
  participants?: LiveRoomParticipant[];
  viewerAttachResponse?: ApiLiveRoomViewerAttachResponse | null;
  onAcceptGuestInvite?: () => void;
  onRsvp?: () => void;
  onWatch?: () => void;
  onBuy?: () => void;
  onViewerRenew?: (uid: number) => Promise<ApiLiveRoomViewerAttachResponse | null>;
  onVerifyAge?: () => void;
}

// Spec-aligned song content (from specs/domain/post.md, asset.md, marketplace.md)
export interface SongContentSpec {
  type: "song";
  // Core metadata
  title: string;
  artist?: string; // Optional - omit when same as post author to avoid redundancy
  caption?: string;
  captionDir?: "ltr" | "rtl" | "auto";
  captionLang?: string;
  annotationsUrl?: string;
  artworkSrc?: string;
  durationLabel?: string;
  durationMs?: number;
  previewDurationMs?: number;

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
  ageGateViewerState?: "proof_required" | "verified_allowed";

  upstreamAttributions?: UpstreamAttribution[];
  storyRegistration?: StoryRegistrationStatus;
  storyLicenseNotice?: StoryLicenseNotice;

  // Commerce axis - from specs/domain/marketplace.md
  listingMode?: ListingMode;
  listingStatus?: ListingStatus;
  priceLabel?: string;
  regionalPriceLabel?: string;
  hasEntitlement?: boolean; // Derived from purchase/ownership state
  vinylRelease?: VinylReleaseSpec;
  downloadPolicy?: DownloadPolicy;
  onDownload?: () => void;
  stems?: StemSpec[];
  entitledStems?: StemKind[];
  storageProofs?: SongStorageProofs;

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
  aspectRatio?: number;
  title?: string;
  caption?: string;
  captionDir?: "ltr" | "rtl" | "auto";
  captionLang?: string;
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
  ageGateViewerState?: "proof_required" | "verified_allowed";
  upstreamAttributions?: UpstreamAttribution[];
  storyRegistration?: StoryRegistrationStatus;

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

export type LinkSummaryStatus = "pending" | "ready" | "failed" | "unavailable" | "manual";

export interface LinkSummaryContent {
  status?: LinkSummaryStatus | null;
  summaryParagraph?: string | null;
  shortSummary?: string | null;
  keyPoints?: string[];
}

export type CrosspostSourceStatus = "available" | "deleted" | "removed" | "unavailable";

export interface CrosspostSourcePreview {
  status: CrosspostSourceStatus;
  communityLabel: string;
  communityHref?: string;
  authorLabel?: string;
  authorHref?: string;
  postType?: "text" | "image" | "video" | "link" | "song" | "live_room";
  title?: string;
  postHref?: string;
  thumbnailAlt?: string;
  thumbnailSrc?: string;
  mediaPreview?: SongContentSpec | VideoContentSpec;
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
      ageGatePolicy?: AgeGatePolicy;
      contentSafetyState?: ContentSafetyState;
      ageGateViewerState?: "proof_required" | "verified_allowed";
      onVerifyAge?: () => void;
    }
  | VideoContentSpec
  | {
      type: "link";
      href: string;
      body?: string;
      bodyDir?: "ltr" | "rtl" | "auto";
      bodyLang?: string;
      previewDescription?: string;
      previewDescriptionDir?: "ltr" | "rtl" | "auto";
      previewDescriptionLang?: string;
      previewTitle?: string;
      previewTitleDir?: "ltr" | "rtl" | "auto";
      previewTitleLang?: string;
      linkLabel?: string;
      sourceLabel?: string;
      publishedLabel?: string;
      previewImageSrc?: string;
      summary?: LinkSummaryContent | null;
      summaryDir?: "ltr" | "rtl" | "auto";
      summaryLang?: string;
    }
  | {
      type: "crosspost";
      source: CrosspostSourcePreview;
    }
  | {
      type: "embed";
      provider: "x" | "youtube" | "kalshi" | "polymarket";
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
        question?: string | null;
        translatedQuestion?: string | null;
        questionDir?: "ltr" | "rtl" | "auto";
        questionLang?: string | null;
        imageUrl?: string | null;
        yesPrice?: number | null;
        yesBid?: number | null;
        yesAsk?: number | null;
        noBid?: number | null;
        noAsk?: number | null;
        lastPrice?: number | null;
        volume?: number | null;
        volume24h?: number | null;
        liquidity?: number | null;
        openInterest?: number | null;
        status?: string | null;
        resolution?: "yes" | "no" | null;
        resolvedOutcome?: string | null;
        closeTime?: string | null;
        updatedAt?: string | null;
        chart?: Array<{
          ts: number;
          price?: number | null;
          volume?: number | null;
          openInterest?: number | null;
        }> | null;
        outcomes?: Array<{
          label: string;
          translatedLabel?: string | null;
          probability: number;
        }> | null;
      } | null;
      oembedHtml?: string | null;
    }
  | LiveRoomContentSpec
  | SongContentSpec;

export type PostCardMenuItem = ActionMenuItem;
export type PostCardShareAction = ActionMenuItem & {
  onSelect?: () => void | Promise<void>;
};

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

export type PostCardViewContext = "home" | "community" | "profile" | "post";
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

export type PostCardEventStatus = "scheduled" | "canceled" | "postponed" | "ended";

export interface PostCardEventPlace {
  label: string;
  address?: string;
  lat: number;
  lon: number;
  source: "geoapify" | "manual";
  providerPlaceId?: string;
  countryCode?: string;
  city?: string;
}

export interface PostCardEvent {
  startsAt: string;
  endsAt?: string;
  timezone: string;
  locationName?: string;
  address?: string;
  isOnline?: boolean;
  eventUrl?: string;
  place?: PostCardEventPlace;
  status?: PostCardEventStatus;
}

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
  event?: PostCardEvent;
  sourceLanguage?: string | null;
  isViewingOriginal?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  engagement: PostCardEngagement;
  menuItems?: PostCardMenuItem[];
  shareActions?: PostCardShareAction[];
  onVote?: (direction: "up" | "down" | null) => void;
  onComment?: () => void;
  onShare?: () => void;
  onToggleOriginal?: () => void;
  onMenuAction?: (key: string) => void;
  className?: string;
}
