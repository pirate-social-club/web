export type ComposerTab = "text" | "image" | "video" | "link" | "song" | "live";

export interface CommunityPickerItem {
  communityId: string;
  displayName: string;
  avatarSrc?: string | null;
}

export type SongMode = "original" | "remix";

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

export interface DerivativeStepState {
  visible: boolean;
  required?: boolean;
  trigger: DerivativeTrigger;
  query?: string;
  references?: ComposerReference[];
  searchResults?: ComposerReference[];
  requirementLabel?: string;
}

export interface MoreOptionsState {
  open?: boolean;
}

export interface LinkPreviewState {
  domain: string;
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
  previewAudioUpload?: File | null;
  previewAudioLabel?: string;
  canvasVideoUpload?: File | null;
  canvasVideoLabel?: string;
  instrumentalAudioUpload?: File | null;
  instrumentalAudioLabel?: string;
  vocalAudioUpload?: File | null;
  vocalAudioLabel?: string;
}

export interface MonetizationState {
  visible: boolean;
  priceLabel?: string;
  priceUsd?: string;
  regionalPricingAvailable?: boolean;
  regionalPricingEnabled?: boolean;
  rightsAttested?: boolean;
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
  anonymousLabel?: string;
  agentLabel?: string;
  availableQualifiers?: QualifierOption[];
  selectedQualifierIds?: string[];
  helpText?: string;
}

export interface PostComposerProps {
  clubName: string;
  clubAvatarSrc?: string;
  communityPickerItems?: CommunityPickerItem[];
  communityPickerEmptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
  mode: ComposerTab;
  availableTabs?: ComposerTab[];
  canCreateSongPost?: boolean;
  canScheduleLivestream?: boolean;
  titleValue?: string;
  titleCountLabel?: string;
  onTitleValueChange?: (value: string) => void;
  textBodyValue?: string;
  onTextBodyValueChange?: (value: string) => void;
  captionValue?: string;
  onCaptionValueChange?: (value: string) => void;
  lyricsValue?: string;
  onLyricsValueChange?: (value: string) => void;
  linkUrlValue?: string;
  onLinkUrlValueChange?: (value: string) => void;
  linkPreview?: LinkPreviewState;
  songMode?: SongMode;
  song?: SongComposerState;
  onSongChange?: (value: SongComposerState) => void;
  onSongModeChange?: (value: SongMode) => void;
  onModeChange?: (value: ComposerTab) => void;
  derivativeStep?: DerivativeStepState;
  onDerivativeStepChange?: (value: DerivativeStepState | undefined) => void;
  monetization?: MonetizationState;
  onMonetizationChange?: (value: MonetizationState) => void;
  charityPartner?: CommunityCharityPartner | null;
  charityContribution?: CharityContributionState;
  onCharityContributionChange?: (value: CharityContributionState) => void;
  audience?: ComposerAudienceState;
  onAudienceChange?: (value: ComposerAudienceState) => void;
  identity?: ComposerIdentityState;
  onAuthorModeChange?: (value: AuthorMode) => void;
  onIdentityModeChange?: (value: IdentityMode) => void;
  onSelectedQualifierIdsChange?: (value: string[]) => void;
  live?: LiveComposerState;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitError?: string | null;
  submitLabel?: string;
  submitLoading?: boolean;
}
