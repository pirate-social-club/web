import type { ActionMenuItem } from "@/components/primitives/action-menu";
import type { SongStreakSummary } from "@/components/compositions/song-study/song-streak-preview";
import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import type { CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

// Domain-aligned types from specs/domain/asset.md and specs/domain/post.md
type AccessMode = "public" | "locked";
type PublicationState = "draft" | "story_requested" | "story_published" | "story_failed";
type SongMode = "original" | "remix";
type RightsBasis = "none" | "original" | "derivative" | "attribution_only" | "licensed_performance";
type AnalysisState = "pending" | "allow" | "allow_with_required_reference" | "review_required" | "blocked";
type ContentSafetyState = "pending" | "safe" | "sensitive" | "adult";
type AgeGatePolicy = CommunityDefaultAgeGatePolicy;

// From specs/domain/marketplace.md
type ListingMode = "not_listed" | "listed";
type ListingStatus = "active" | "paused" | "sold_out" | "removed";
type VinylReleaseProvider = "elasticstage";

export type DownloadPolicy = "stream_only" | "free_download" | "purchased_download";
export type StemKind = "instrumental" | "vocals" | "drums" | "bass" | "other";
export type StemAccessPolicy = "inherit" | "free" | "purchasers_only" | "unavailable";

interface VinylReleaseSpec {
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

interface SongStorageProofs {
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
  artistHref?: string;
  href?: string;
  sourceCommunityId?: string;
  sourcePostId?: string;
}

type StoryRegistrationState = "registered" | "pending" | "failed";

export interface StoryRegistrationStatus {
  state: StoryRegistrationState;
  label: string;
  description?: string;
}

export interface StoryLicenseNotice {
  label: string;
  description?: string;
}

type VideoMode = "original" | "reaction" | "clip" | "remix";
type LiveRoomStatus = "scheduled" | "live" | "ended" | "canceled";
type LiveRoomKind = "solo" | "duet";
type LiveRoomAccessMode = "free" | "gated" | "paid";
type LiveRoomVisibility = "public" | "unlisted";
type LiveRoomAccessState =
  | "allowed"
  | "gate_required"
  | "purchase_required"
  | "waiting"
  | "missing_listing"
  | "ended";

type LiveRoomReplayStatus = "none" | "processing" | "review_pending" | "published" | "failed";

type LiveRoomProducerRole = "host" | "guest" | null;
type LiveRoomRsvpState = "none" | "going";

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
  replayDurationLabel?: string;
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
  gatePurchaseLabel?: string;
  gateOwnershipRequired?: boolean;
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
  onGatePurchase?: () => void;
  onReviewReplay?: () => void;
  onViewerRenew?: (uid: number) => Promise<ApiLiveRoomViewerAttachResponse | null>;
  onVerifyAge?: () => void;
}

// Spec-aligned song content (from specs/domain/post.md, asset.md, marketplace.md)
type SongStudyStatus = "unavailable" | "processing" | "ready" | "locked";
type SongFeatureCapabilityReasonCode =
  | "lyrics_missing"
  | "lyrics_too_short"
  | "exercise_generation_failed"
  | "provider_key_missing"
  | "provider_key_invalid"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_response"
  | "instrumental_missing"
  | "timed_lyrics_missing"
  | "alignment_failed"
  | "karaoke_disabled"
  | "locked";

export interface SongFeatureCapabilityReason {
  code: SongFeatureCapabilityReasonCode;
  kind: "config" | "content" | "processing_failure" | "entitlement" | "unavailable";
  ownerAction: "none" | "manage_integrations" | "retry" | "edit_song" | "upload_instrumental" | "enable_karaoke" | "buy";
}

interface SongStudyCapability {
  status: SongStudyStatus;
  previewOnly?: boolean;
  exerciseCount?: number;
  rewardLabel?: string;
  reason?: SongFeatureCapabilityReason;
  sourceLanguage?: string;
  targetLanguage?: string;
}

type SongKaraokeStatus = "unavailable" | "processing" | "ready" | "failed";
interface SongKaraokeCapability {
  rewardLabel?: string;
  reason?: SongFeatureCapabilityReason;
  status: SongKaraokeStatus;
  previewOnly?: boolean;
}

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
  viewerCanManage?: boolean;
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
  // Link to the karaoke ("Sing") surface for this song, when available.
  karaoke?: SongKaraokeCapability;
  karaokeHref?: string;
  onKaraoke?: () => void;

  // The study ("Study") capability + surface for this song, when available.
  study?: SongStudyCapability;
  studyHref?: string;
  onStudy?: () => void;

  // Streak leaderboard for this song. `streakSummary` renders the inline streak
  // section (top holder + viewer standing) inside the card above the vote bar;
  // `onStreaks` opens the full leaderboard from the section's subtle top-right link.
  streaksHref?: string;
  streakSummary?: SongStreakSummary;
  onStreaks?: () => void;

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

type LinkSummaryStatus = "pending" | "ready" | "failed" | "unavailable" | "manual";

interface LinkSummaryContent {
  status?: LinkSummaryStatus | null;
  summaryParagraph?: string | null;
  shortSummary?: string | null;
  keyPoints?: string[];
}

type CrosspostSourceStatus = "available" | "deleted" | "removed" | "unavailable";

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

type PostCardAgentAuthor = {
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
  /** Positive reactions only. Unlike score, this never includes downvotes. */
  upvoteCount?: number;
  viewerVote?: "up" | "down" | null;
  voteBusy?: boolean;
  commentCount: number;
  saved?: boolean;
  unlock?: {
    label: string;
    onBuy: () => void;
  };
};

type PostCardEventStatus = "scheduled" | "canceled" | "postponed" | "ended";

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
  /** Canonical post identity used by app-level media experiences. */
  postId?: string;
  viewContext?: PostCardViewContext;
  previewMode?: boolean;
  identityPresentation?: PostCardIdentityPresentation;
  byline: PostCardByline;
  authorCommunityRole?: CommunityAuthorRole | null;
  authorNationalityBadgeCountry?: string | null;
  authorNationalityBadgeLabel?: string;
  qualifierLabels?: string[];
  statusNotice?: {
    tone: "neutral" | "destructive";
    label: string;
    message?: string | null;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
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
  onVote?: (direction: "up" | "down" | null) => Promise<void> | void;
  voteAccess?: {
    label: string;
    onClick?: () => void;
  };
  onComment?: () => void;
  /** Optional override for the shell-owned vertical viewer entry action. */
  onOpenVideoViewer?: () => void;
  onShare?: () => void;
  onToggleOriginal?: () => void;
  onMenuAction?: (key: string) => void;
  className?: string;
}
