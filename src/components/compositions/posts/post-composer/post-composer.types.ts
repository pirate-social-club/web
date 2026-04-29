export type ComposerTab = "text" | "image" | "video" | "link" | "song" | "live";
export type ComposerStep = "write" | "details" | "settings" | "publish";

export type AttachmentKind = "link" | "image" | "video" | "song" | "live";

export type AttachmentState =
  | { kind: "link"; url: string }
  | { kind: "image"; label: string; previewUrl?: string }
  | { kind: "video"; label: string; previewUrl?: string }
  | { kind: "song"; label: string }
  | { kind: "live" }
  | null;

export type ComposerUploadValue = { name: string; previewUrl?: string } | null;

export interface SongDetailsState {
  canvasVideo: ComposerUploadValue;
  coverArt: ComposerUploadValue;
  genre: string;
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

export type LiveVisibility = "public" | "unlisted";

export type PostAudience = "public" | "members_only";

export type LiveSetlistItemKind = "original" | "cover" | "remix" | "dj_playback" | "unknown";

export interface LivePerformerAllocation {
  userId: string;
  role: "host" | "guest";
  sharePct: number;
}

export type DerivativeTrigger = "remix" | "declaration" | "analysis";

export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";

export type IdentityMode = "public" | "anonymous";
export type AuthorMode = "human" | "agent";

export interface QualifierOption {
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
  visibility: LiveVisibility;
  scheduleAt?: string;
  description?: string;
  guestUserId?: string;
  coverUpload?: File | null;
  coverLabel?: string;
  trackOptions?: ComposerReference[];
  setlistItems: LiveSetlistItemInput[];
  setlistStatus: "draft" | "active";
  performerAllocations: LivePerformerAllocation[];
}

export interface DerivativeLicenseSummary {
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
  requirementLabel?: string;
  licenseSummary?: DerivativeLicenseSummary;
  sourceTermsAccepted?: boolean;
}

export interface MoreOptionsState {
  open?: boolean;
}

export interface LinkPreviewState {
  domain: string;
  title?: string;
  imageSrc?: string;
}

export interface SongComposerState {
  genre?: string;
  primaryLanguage?: string;
  secondaryLanguage?: string;
  primaryAudioUpload?: File | null;
  primaryAudioLabel?: string;
  coverUpload?: File | null;
  coverLabel?: string;
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

export interface VideoComposerState {
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
}

export interface CharityContributionState {
  percentagePct: number;
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
  realNameLabel?: string;
  reputationLabel?: string;
  anonymousLabel?: string;
  agentLabel?: string;
  availableQualifiers?: QualifierOption[];
  selectedQualifierIds?: string[];
  helpText?: string;
}

export interface PostComposerDraftState {
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
  derivativeStep?: DerivativeStepState;
  monetization?: MonetizationState;
  charityPartner?: CommunityCharityPartner | null;
  charityContribution?: CharityContributionState;
  audience?: ComposerAudienceState;
  identity?: ComposerIdentityState;
  live?: LiveComposerState;
}

export interface PostComposerDraftActions {
  onCaptionValueChange?: (value: string) => void;
  onImageUploadChange?: (file: File | null) => void;
  onTextBodyValueChange?: (value: string) => void;
  onTitleValueChange?: (value: string) => void;
  onLyricsValueChange?: (value: string) => void;
  onLinkUrlValueChange?: (value: string) => void;
  onSongChange?: (value: SongComposerState) => void;
  onLicenseChange?: (value: AssetLicenseState) => void;
  onVideoChange?: (value: VideoComposerState) => void;
  onSongModeChange?: (value: SongMode) => void;
  onModeChange?: (value: ComposerTab) => void;
  onDerivativeStepChange?: (value: DerivativeStepState | undefined) => void;
  onMonetizationChange?: (value: MonetizationState) => void;
  onCharityContributionChange?: (value: CharityContributionState) => void;
  onAudienceChange?: (value: ComposerAudienceState) => void;
  onAuthorModeChange?: (value: AuthorMode) => void;
  onIdentityModeChange?: (value: IdentityMode) => void;
  onSelectedQualifierIdsChange?: (value: string[]) => void;
}

export interface PostComposerSubmitState {
  canContinue?: boolean;
  canPost?: boolean;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  loading?: boolean;
  onSubmit?: () => void;
}

export interface PostComposerProps extends Partial<PostComposerDraftState>, PostComposerDraftActions {
  clubName: string;
  clubAvatarSrc?: string;
  onClose?: () => void;
  communityPickerItems?: CommunityPickerItem[];
  communityPickerEmptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
  availableTabs?: ComposerTab[];
  canCreateSongPost?: boolean;
  draft?: PostComposerDraftState;
  actions?: PostComposerDraftActions;
  submit?: PostComposerSubmitState;
  composerStep?: ComposerStep;
  onComposerStepChange?: (value: ComposerStep) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitError?: string | null;
  submitLabel?: string;
  submitLoading?: boolean;
}
