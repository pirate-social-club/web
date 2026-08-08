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

export type HnsRawResourceRecord = Record<string, unknown>;

export type HnsImportChallengePayload = {
  kind: "hns_import";
  publish_plan: {
    version: "hns_import_publish_v1";
    replacement_semantics: "complete_resource";
    current_records: HnsRawResourceRecord[];
    preserved_records: HnsRawResourceRecord[];
    removed_conflicts: HnsRawResourceRecord[];
    added_records: HnsRawResourceRecord[];
    replacement_records: HnsRawResourceRecord[];
    preserved_unknown_record_types: string[];
    acknowledgement_required: true;
  };
  observed_chain_anchor: {
    network: string;
    height: number;
    block_hash: string;
    median_time: number;
  };
  update_observed_height?: number;
  target_tree_boundary?: number;
  replacement_acknowledged_at?: string;
  observation?: {
    state: "waiting_for_update" | "resource_mismatch" | "pending_tree_commit" | "delegation_not_secure" | "secure";
    current_height: number;
    target_tree_boundary?: number;
    missing_records?: HnsRawResourceRecord[];
    unexpected_records?: HnsRawResourceRecord[];
  };
};

export type NamespaceVerificationStartResult = {
  namespaceVerificationSessionId: string;
  family: NamespaceFamily;
  rootLabel: string;
  challengeHost: string | null;
  challengeTxtValue: string | null;
  challengePayload: SpacesChallengePayload | null;
  hnsImportPayload?: HnsImportChallengePayload | null;
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
  hnsImportPayload?: HnsImportChallengePayload | null;
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
    acknowledgedResourceReplacement?: boolean;
  }) => Promise<NamespaceVerificationCompleteResult>;
  onGetSession: (input: {
    namespaceVerificationSessionId: string;
  }) => Promise<NamespaceVerificationStartResult>;
}
