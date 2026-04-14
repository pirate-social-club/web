export type OnboardingPhase = "import_karma" | "choose_name" | "suggested_communities";

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

export type HandleAvailability = "available" | "taken" | "manual_review";

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
  source: "verified_reddit_username";
  availability: HandleAvailability;
  reason?: string;
}

export interface OnboardingActions {
  primaryLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
}

export interface OnboardingActions {
  primaryLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
}

export interface OnboardingCallbacks {
  onUsernameChange: (value: string) => void;
  onImportKarmaNext: () => void;
  onImportKarmaSkip: () => void;
  onHandleChange: (value: string) => void;
  onGenerateHandle: () => void;
  onChooseNameContinue: () => void;
  onSuggestedCommunitiesContinue: () => void;
  onSuggestedCommunitiesSkip: () => void;
}

export interface OnboardingRedditBootstrapProps {
  generatedHandle: string;
  canSkip: boolean;
  busy?: boolean;
  phaseError?: string | null;
  phase: OnboardingPhase;
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  snapshot?: SnapshotState;
  handleSuggestion?: HandleSuggestion;
  actions: OnboardingActions;
  callbacks?: OnboardingCallbacks;
}
