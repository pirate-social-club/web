export type OnboardingPhase = "import_karma" | "choose_name";

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

export interface HandleSuggestion {
  suggestedLabel: string;
  source: "verified_reddit_username";
  availability: HandleAvailability;
  reason?: string;
}

export interface OnboardingActions {
  primaryLabel?: string;
  tertiaryLabel?: string;
}

export interface OnboardingCallbacks {
  onUsernameChange: (value: string) => void;
  onImportKarmaNext: () => void;
  onImportKarmaSkip: () => void;
  onHandleChange: (value: string) => void;
  onGenerateHandle: () => void;
  onChooseNameContinue: () => void;
}

export interface OnboardingRedditBootstrapProps {
  generatedHandle: string;
  canSkip: boolean;
  busy?: boolean;
  phaseError?: string | null;
  phase: OnboardingPhase;
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  handleSuggestion?: HandleSuggestion;
  actions?: OnboardingActions;
  callbacks?: OnboardingCallbacks;
}
