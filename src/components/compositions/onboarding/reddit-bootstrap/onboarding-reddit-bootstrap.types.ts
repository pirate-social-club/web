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
