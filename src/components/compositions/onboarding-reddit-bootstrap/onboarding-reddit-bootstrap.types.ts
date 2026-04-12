export type OnboardingPhase = "reddit" | "username" | "communities";

export type VerificationState =
  | "not_started"
  | "code_ready"
  | "checking"
  | "verified"
  | "failed"
  | "rate_limited";

export type CodePlacementSurface = "profile" | "bio" | "about";

export type ImportJobStatus =
  | "not_started"
  | "ready"
  | "queued"
  | "running"
  | "partial_success"
  | "succeeded"
  | "failed"
  | "source_unavailable";

export type HandleAvailability = "available" | "taken" | "manual_review" | "reserved" | "invalid";

export type HandleSuggestionSource = "verified_reddit_username" | "generated";

export interface RedditVerificationState {
  usernameValue: string;
  verifiedUsername?: string;
  verificationState: VerificationState;
  verificationHint?: string;
  codePlacementSurface?: CodePlacementSurface;
  lastCheckedAt?: string;
  errorTitle?: string;
  errorBody?: string;
}

export interface ImportJobState {
  sourceLabel?: string;
  status: ImportJobStatus;
  progressLabel?: string;
  queueNote?: string;
  warning?: string;
  errorTitle?: string;
  errorBody?: string;
}

export interface SubredditEntry {
  subreddit: string;
  karma?: number | null;
  posts?: number | null;
  rankSource?: "karma" | "posts" | "source_order";
}

export interface SuggestedCommunity {
  communityId: string;
  name: string;
  reason: string;
}

export interface SnapshotState {
  accountAgeDays?: number;
  globalKarma?: number | null;
  topSubreddits: SubredditEntry[];
  moderatorOf: string[];
  inferredInterests: string[];
  suggestedCommunities: SuggestedCommunity[];
  coverageNote?: string;
}

export interface HandleSuggestion {
  suggestedLabel: string;
  source: HandleSuggestionSource;
  availability: HandleAvailability;
  reason?: string;
}

export interface OnboardingActions {
  primaryLabel: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
}

export interface OnboardingRedditOptionalProps {
  canSkip: boolean;
  canContinue: boolean;
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  snapshot?: SnapshotState;
  actions: OnboardingActions;
  nextLoading?: boolean;
  onNext?: () => void;
  onSkip?: () => void;
  onUsernameChange?: (value: string) => void;
}

export interface OnboardingChoosePirateUsernameProps {
  handleValue?: string;
  handleSuggestion?: HandleSuggestion;
  actions: {
    primaryLabel: string;
  };
  nextLoading?: boolean;
  onHandleChange?: (value: string) => void;
  onNext?: () => void;
}

export interface OnboardingCommunitySuggestionsProps {
  communities: SuggestedCommunity[];
  actions: OnboardingActions;
  joinedCommunityIds?: string[];
  joiningCommunityId?: string | null;
  nextLoading?: boolean;
  onJoinCommunity?: (communityId: string) => void;
  onNext?: () => void;
  onSkip?: () => void;
}

export type OnboardingRedditBootstrapProps = OnboardingRedditOptionalProps;
