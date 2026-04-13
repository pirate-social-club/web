export type NamespaceFamily = "hns" | "spaces";

export type NamespaceVerificationModalState =
  | "idle"
  | "starting"
  | "record_ready"
  | "verifying"
  | "verified"
  | "failed"
  | "expired";

export interface NamespaceVerificationCallbacks {
  onStartSession: (input: {
    rootLabel: string;
  }) => Promise<{
    namespaceVerificationSessionId: string;
    challengeHost: string;
    challengeTxtValue: string;
    challengeExpiresAt: string | null;
    status: string;
  }>;
  onCompleteSession: (input: {
    namespaceVerificationSessionId: string;
    restartChallenge?: boolean;
  }) => Promise<{
    status: string;
    namespaceVerificationId: string | null;
    failureReason: string | null;
  }>;
}

export interface VerifyNamespaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: (namespaceVerificationId: string) => void;
  callbacks: NamespaceVerificationCallbacks;
  initialRootLabel?: string;
  forceMobile?: boolean;
}
