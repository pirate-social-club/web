type OnboardingPhase = "import_karma" | "choose_name";

type VerificationState =
  | "not_started"
  | "code_ready"
  | "checking"
  | "verified"
  | "failed"
  | "rate_limited";

type CodePlacementSurface = "profile" | "bio" | "about";

type ImportJobStatus =
  | "not_started"
  | "ready"
  | "queued"
  | "running"
  | "partial_success"
  | "succeeded"
  | "failed"
;

type HandleAvailability = "available" | "taken" | "manual_review";

export interface RedditVerificationState {
  usernameValue: string;
  verifiedUsername?: string;
  verificationState: VerificationState;
  verificationHint?: string;
  codePlacementSurface?: CodePlacementSurface;
  lastCheckedAt?: string;
  failureCode?: string;
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

export interface RedditImportSummaryState {
  redditUsername: string;
  importedRedditScore?: number | null;
  coverageNote?: string | null;
}

export interface HandleSuggestion {
  suggestedLabel: string;
  source: "verified_reddit_username";
  availability: HandleAvailability;
  reason?: string;
}

interface OnboardingActions {
  primaryLabel?: string;
  tertiaryLabel?: string;
}

interface OnboardingCallbacks {
  onUsernameChange: (value: string) => void;
  onImportKarmaNext: () => void;
  onImportKarmaSkip: () => void;
  onHandleChange: (value: string) => void;
  onGenerateHandle: () => void;
  onChooseNameBack: () => void;
  onChooseNameContinue: () => void;
}

interface OnboardingRedditBootstrapProps {
  generatedHandle: string;
  canSkip: boolean;
  busy?: boolean;
  layout?: "card" | "mobile";
  phaseError?: string | null;
  phase: OnboardingPhase;
  reddit: RedditVerificationState;
  importJob: ImportJobState;
  redditImportSummary?: RedditImportSummaryState | null;
  handleSuggestion?: HandleSuggestion;
  actions?: OnboardingActions;
  callbacks?: OnboardingCallbacks;
}
