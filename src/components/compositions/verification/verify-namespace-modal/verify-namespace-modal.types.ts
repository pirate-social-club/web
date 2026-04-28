export type NamespaceFamily = "hns" | "spaces";

export type NamespaceVerificationStatus =
  | "draft"
  | "inspecting"
  | "dns_setup_required"
  | "challenge_required"
  | "challenge_pending"
  | "verifying"
  | "verified"
  | "failed"
  | "expired"
  | "disputed";

export type NamespaceVerificationOperationClass =
  | "owner_managed_namespace"
  | "routing_only_namespace"
  | "pirate_delegated_namespace"
  | "owner_signed_updates_namespace";

export type NamespaceVerificationModalState =
  | "idle"
  | "starting"
  | "dns_setup_required"
  | "challenge_ready"
  | "challenge_pending"
  | "verifying"
  | "verified"
  | "failed"
  | "expired";

export type SpacesChallengePayload = {
  kind: "fabric_txt_publish";
  domain: string;
  root_label: string;
  root_pubkey: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  txt_key: "pirate-verify";
  txt_value: string;
  web_url: string;
  freedom_url: string;
};

export type NamespaceVerificationStartResult = {
  namespaceVerificationSessionId: string;
  family: NamespaceFamily;
  rootLabel: string;
  challengeHost: string | null;
  challengeTxtValue: string | null;
  challengePayload: SpacesChallengePayload | null;
  challengeExpiresAt: string | null;
  status: NamespaceVerificationStatus;
  operationClass: NamespaceVerificationOperationClass | null;
  pirateDnsAuthorityVerified: boolean | null;
  setupNameservers: string[] | null;
};

export type NamespaceVerificationCompleteResult = {
  status: NamespaceVerificationStatus;
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
