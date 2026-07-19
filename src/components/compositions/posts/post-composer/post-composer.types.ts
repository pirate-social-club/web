import type { AnonymousIdentityScope } from "@/lib/community-access-types";
import type { PostCardEventPlace } from "@/components/compositions/posts/post-card/post-card.types";

export type ComposerTab = "text" | "image" | "video" | "link" | "song" | "live";
export type ComposerStep = "write" | "details" | "settings" | "publish";

export type AttachmentKind = "link" | "image" | "video" | "song" | "live";

export type AttachmentState =
  | { kind: "link"; url: string }
  | { kind: "image"; label: string; previewUrl?: string }
  | { aspectRatio?: number; kind: "video"; label: string; posterUrl?: string; previewUrl?: string }
  | { kind: "song"; artworkUrl?: string; label: string; previewUrl?: string }
  | { kind: "live" }
  | null;

type ComposerUploadValue = { name: string; previewUrl?: string } | null;

interface SongDetailsState {
  canvasVideo: ComposerUploadValue;
  coverArt: ComposerUploadValue;
  genre: string;
  geniusAnnotationsUrl: string;
  instrumentalStem: ComposerUploadValue;
  language: string;
  lyrics: string;
  vocalStem: ComposerUploadValue;
}

export interface VideoDetailsState {
  posterFrameSeconds: string;
  thumbnail: ComposerUploadValue;
}

export interface CommunityPickerItem {
  communityId: string;
  displayName: string;
  avatarSrc?: string | null;
}

export type SongMode = "original" | "remix";

export type AssetLicensePresetId = "non-commercial" | "commercial-use" | "commercial-remix";

export type LiveRoomKind = "solo" | "duet";

export type LiveAccessMode = "free" | "gated" | "paid";

type LiveAudienceGateMode = "community_members" | "purchase_entitlement";

export type LiveVisibility = "public" | "unlisted";

export type PostAudience = "public" | "members_only";
export type AuthorAgeGatePolicy = "none" | "18_plus";

export type LiveSetlistItemKind = "original" | "cover" | "remix" | "dj_playback" | "unknown";

interface LivePerformerAllocation {
  userId: string;
  role: "host" | "guest";
  sharePct: number;
}

type DerivativeTrigger = "remix" | "declaration" | "uses_song";

export type { AnonymousIdentityScope };

export type IdentityMode = "public" | "anonymous";
export type AuthorMode = "human" | "agent";

interface QualifierOption {
  qualifierId: string;
  label: string;
  description?: string;
  sensitivityLevel?: "low" | "high";
  sourceProvider?: "self" | "very" | "world";
  sourceField?: string;
  redundancyKey?: string;
  suppressedByClubGate?: boolean;
  suppressionReason?: string;
}

export interface ComposerReference {
  id: string;
  title: string;
  subtitle?: string;
  licensePreset?: AssetLicensePresetId | null;
  upstreamRoyaltyPct?: number | null;
  parentIpId?: string | null;
  licenseTermsId?: string | null;
}

export interface LiveSetlistItemInput {
  titleText: string;
  artistText?: string;
  declaredTrackId?: string;
  performanceKind: LiveSetlistItemKind;
}

export interface LiveComposerState {
  roomKind: LiveRoomKind;
  accessMode: LiveAccessMode;
  audienceGateMode?: LiveAudienceGateMode;
  audienceGateTargetRefs?: string[];
  visibility: LiveVisibility;
  scheduleForLater?: boolean;
  scheduleAt?: string;
  description?: string;
  guestUserId?: string;
  storeUrl?: string;
  storeLabel?: string;
  coverUpload?: File | null;
  coverLabel?: string;
  recordingEnabled?: boolean;
  trackOptions?: ComposerReference[];
  setlistItems: LiveSetlistItemInput[];
  setlistStatus: "draft" | "ready" | "locked";
  performerAllocations: LivePerformerAllocation[];
}

export type ComposerEventPlace = PostCardEventPlace;

export interface ComposerEventState {
  enabled?: boolean;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  locationName?: string;
  address?: string;
  isOnline?: boolean;
  eventUrl?: string;
  place?: ComposerEventPlace;
}

interface DerivativeLicenseSummary {
  sourceLicense?: string;
  upstreamRoyaltyPct?: number;
  parentIpId?: string;
  licenseTermsId?: string;
  newRemixTerms?: string;
}

export interface DerivativeStepState {
  visible: boolean;
  required?: boolean;
  trigger: DerivativeTrigger;
  query?: string;
  references?: ComposerReference[];
  searchResults?: ComposerReference[];
  searchError?: string;
  searchLoading?: boolean;
  requirementLabel?: string;
  licenseSummary?: DerivativeLicenseSummary;
  sourceTermsAccepted?: boolean;
}

interface MoreOptionsState {
  open?: boolean;
}

export interface LinkPreviewState {
  domain: string;
  description?: string;
  title?: string;
  imageSrc?: string;
  provider?: "x" | "youtube" | "kalshi" | "polymarket" | null;
  canonicalUrl?: string;
  originalUrl?: string;
  state?: "embed" | "preview" | "unavailable";
  embedPreview?: {
    authorName?: string | null;
    authorUrl?: string | null;
    text?: string | null;
    hasMedia?: boolean | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    thumbnailWidth?: number | null;
    thumbnailHeight?: number | null;
  };
  oembedHtml?: string | null;
}

export interface SongComposerState {
  title?: string;
  genre?: string;
  geniusAnnotationsUrl?: string;
  primaryLanguage?: string;
  secondaryLanguage?: string;
  primaryAudioUpload?: File | null;
  primaryAudioLabel?: string;
  coverUpload?: File | null;
  coverLabel?: string;
  coverSource?: "embedded" | "upload";
  previewStartSeconds?: string;
  canvasVideoUpload?: File | null;
  canvasVideoLabel?: string;
  instrumentalAudioUpload?: File | null;
  instrumentalAudioLabel?: string;
  vocalAudioUpload?: File | null;
  vocalAudioLabel?: string;
}

export interface AssetLicenseState {
  presetId: AssetLicensePresetId;
  commercialRevSharePct?: number;
}

interface AssetRoyaltyAllocation {
  id: string;
  recipientKind: "creator" | "collaborator";
  walletAddress?: string;
  sharePct: number;
}

export interface AssetRoyaltySplitState {
  allocations: AssetRoyaltyAllocation[];
}

export interface VideoComposerState {
  primaryVideoAspectRatio?: number;
  primaryVideoUpload?: File | null;
  primaryVideoLabel?: string;
  posterFrameSeconds?: string;
}

export interface MonetizationState {
  visible: boolean;
  priceLabel?: string;
  priceUsd?: string;
  regionalPricingAvailable?: boolean;
  regionalPricingEnabled?: boolean;
  vinylReleaseUrl?: string;
}

export interface RegionalPricingTierPreview {
  tierKey: string;
  displayName: string;
  adjustmentType: "multiplier";
  adjustmentValue: number;
  countryCodes: string[];
}

export interface RegionalPricingPreview {
  defaultTierKey?: string | null;
  tiers: RegionalPricingTierPreview[];
}

export interface CharityContributionState {
  percentagePct: number;
  userConfigured?: boolean;
}

export interface CommunityCharityPartner {
  partnerId: string;
  displayName: string;
  imageUrl?: string | null;
}

export interface ComposerAudienceState {
  visibility: PostAudience;
  publicOptionEnabled?: boolean;
  publicOptionDisabledReason?: string;
}

export interface ComposerIdentityState {
  visible?: boolean;
  allowAnonymousIdentity?: boolean;
  allowQualifiersOnAnonymousPosts?: boolean;
  identityMode?: IdentityMode;
  authorMode?: AuthorMode;
  publicHandle?: string;
  publicAvatarSrc?: string | null;
  publicAvatarSeed?: string | null;
  realNameLabel?: string;
  reputationLabel?: string;
  anonymousLabel?: string;
  anonymousDescription?: string;
  agentLabel?: string;
  availableQualifiers?: QualifierOption[];
  selectedQualifierIds?: string[];
  helpText?: string;
}

interface PostComposerDraftState {
  mode: ComposerTab;
  titleValue?: string;
  titleCountLabel?: string;
  textBodyValue?: string;
  captionValue?: string;
  imageUpload?: File | null;
  imageUploadLabel?: string;
  video?: VideoComposerState;
  lyricsValue?: string;
  linkUrlValue?: string;
  linkPreview?: LinkPreviewState;
  songMode?: SongMode;
  song?: SongComposerState;
  license?: AssetLicenseState;
  royaltySplit?: AssetRoyaltySplitState;
  derivativeStep?: DerivativeStepState;
  monetization?: MonetizationState;
  charityPartner?: CommunityCharityPartner | null;
  charityContribution?: CharityContributionState;
  audience?: ComposerAudienceState;
  ageGatePolicy?: AuthorAgeGatePolicy;
  identity?: ComposerIdentityState;
  live?: LiveComposerState;
  event?: ComposerEventState;
  regionalPricingPreview?: RegionalPricingPreview | null;
}

interface PostComposerDraftActions {
  onCaptionValueChange?: (value: string) => void;
  onImageUploadChange?: (file: File | null) => void;
  onTextBodyValueChange?: (value: string) => void;
  onTitleValueChange?: (value: string) => void;
  onLyricsValueChange?: (value: string) => void;
  onLinkUrlValueChange?: (value: string) => void;
  onLinkPreviewChange?: (value: LinkPreviewState | undefined) => void;
  onSongChange?: (value: SongComposerState) => void;
  onLicenseChange?: (value: AssetLicenseState) => void;
  onRoyaltySplitChange?: (value: AssetRoyaltySplitState) => void;
  onVideoChange?: (value: VideoComposerState) => void;
  onSongModeChange?: (value: SongMode) => void;
  onModeChange?: (value: ComposerTab) => void;
  onDerivativeStepChange?: (value: DerivativeStepState | undefined) => void;
  onMonetizationChange?: (value: MonetizationState) => void;
  onCharityContributionChange?: (value: CharityContributionState) => void;
  onAudienceChange?: (value: ComposerAudienceState) => void;
  onAgeGatePolicyChange?: (value: AuthorAgeGatePolicy) => void;
  onAuthorModeChange?: (value: AuthorMode) => void;
  onIdentityModeChange?: (value: IdentityMode) => void;
  onSelectedQualifierIdsChange?: (value: string[]) => void;
  onLiveChange?: (value: LiveComposerState) => void;
  onEventChange?: (value: ComposerEventState) => void;
}

interface PostComposerSubmitState {
  canContinue?: boolean;
  canPost?: boolean;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  loading?: boolean;
  onSubmit?: () => void;
  progress?: SubmitProgress | null;
}

export type SubmitProgressPhase =
  | "validating"
  | "preparing_media"
  | "uploading_media"
  | "processing_media"
  | "checking_rights"
  | "publishing_post"
  | "creating_listing"
  | "checking_registration"
  | "done";

// How the submit progress bar computes its 0→1 fill (see submitProgressFraction):
// - "pipeline": a multi-stage flow (song, video) — fill by completed steps, with a
//   byte-% interpolated within the current step.
// - "activity": a flow dominated by a single upload (image/text/link, live cover,
//   and song posts that reuse a pre-uploaded bundle) — fill directly by the upload's
//   byte-%. Either way the button label is a constant "Posting…".
export type SubmitProgressDisplay = "pipeline" | "activity";

export type SubmitProgress = {
  phase: SubmitProgressPhase;
  label: string;
  detail?: string;
  currentIndex: number;
  totalSteps: number;
  display: SubmitProgressDisplay;
};

export interface PostComposerProps extends Partial<PostComposerDraftState>, PostComposerDraftActions {
  clubName: string;
  clubAvatarSrc?: string;
  onClose?: () => void;
  communityPickerItems?: CommunityPickerItem[];
  communityPickerEmptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
  availableTabs?: ComposerTab[];
  canCreateSongPost?: boolean;
  currentUserWalletAddress?: string;
  draft?: PostComposerDraftState;
  actions?: PostComposerDraftActions;
  submit?: PostComposerSubmitState;
  composerStep?: ComposerStep;
  regionalPricingPreview?: RegionalPricingPreview | null;
  onSearchEventPlaces?: (query: string) => Promise<ComposerEventPlace[]>;
  onComposerStepChange?: (value: ComposerStep) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitError?: string | null;
  submitLabel?: string;
  submitLoading?: boolean;
}
