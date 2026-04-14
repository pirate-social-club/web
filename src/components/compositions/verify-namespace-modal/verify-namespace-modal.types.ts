export type NamespaceFamily = "hns" | "spaces";

export type NamespaceVerificationModalState =
  | "idle"
  | "starting"
  | "challenge_ready"
  | "verifying"
  | "verified"
  | "failed"
  | "expired";

export type SpacesChallengePayload = {
  kind: "schnorr_sign";
  domain: string;
  root_label: string;
  root_pubkey: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  message: string;
  digest: string;
};

export type NamespaceVerificationStartResult = {
  namespaceVerificationSessionId: string;
  family: NamespaceFamily;
  rootLabel: string;
  challengeHost: string | null;
  challengeTxtValue: string | null;
  challengePayload: SpacesChallengePayload | null;
  challengeExpiresAt: string | null;
  status: string;
};

export type NamespaceVerificationCompleteResult = {
  status: string;
  namespaceVerificationId: string | null;
  failureReason: string | null;
};

export interface NamespaceVerificationCallbacks {
  onStartSession: (input: {
    family: NamespaceFamily;
    rootLabel: string;
  }) => Promise<NamespaceVerificationStartResult>;
  onCompleteSession: (input: {
    namespaceVerificationSessionId: string;
    family: NamespaceFamily;
    restartChallenge?: boolean;
    signaturePayload?: { signature: string; signer_pubkey?: string } | null;
  }) => Promise<NamespaceVerificationCompleteResult>;
  onGetSession: (input: {
    namespaceVerificationSessionId: string;
  }) => Promise<NamespaceVerificationStartResult>;
}

export interface VerifyNamespaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: (namespaceVerificationId: string) => void;
  callbacks: NamespaceVerificationCallbacks;
  initialRootLabel?: string;
  initialFamily?: NamespaceFamily;
  forceMobile?: boolean;
  activeSessionId?: string | null;
  onSessionStarted?: (sessionId: string) => void;
  onSessionCleared?: () => void;
}
