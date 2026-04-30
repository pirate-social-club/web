import type { AgentOwnershipProvider } from "@pirate/api-contracts";

export type OwnedAgentStatus =
  | "pending"
  | "active"
  | "suspended"
  | "revoked"
  | "transferred"
  | "deregistered";

export type OwnershipProvider = AgentOwnershipProvider;

export interface OwnedAgentOwnershipSnapshot {
  ownershipProvider: OwnershipProvider;
  verifiedAt: string;
  expiresAt: string | null;
}

export interface OwnedAgent {
  agentId: string;
  displayName: string;
  handleLabel: string | null;
  status: OwnedAgentStatus;
  createdAt: string;
  currentOwnership: OwnedAgentOwnershipSnapshot | null;
}

export type AgentRegistrationState =
  | { kind: "idle" }
  | { kind: "verifying" }
  | {
    kind: "pairing_code";
    pairingCode: string;
    expiresAt: string;
  }
  | {
    kind: "awaiting_owner";
    registrationUrl: string;
    sessionId: string;
    expiresAt?: string | null;
  }
  | { kind: "complete" }
  | { kind: "error"; message: string };

export type AgentRegistrationUnavailableReason =
  | "verification_required"
  | "active_agent_exists";

export interface OwnedAgentsPanelProps {
  agents: OwnedAgent[];
  canRegister: boolean;
  loading?: boolean;
  showTitle?: boolean;
  registrationUnavailableReason?: AgentRegistrationUnavailableReason;
  registrationState: AgentRegistrationState;
  importValue?: string;
  onStartPairing?: (handleLabel: string) => void;
  onImportValueChange?: (value: string) => void;
  onImportRegistration?: (handleLabel: string) => void;
  onCheckRegistration?: () => void;
  onDeregister?: (agentId: string) => void;
  onStartVerification?: () => void;
  onUpdateName?: (agentId: string, displayName: string) => Promise<void> | void;
  onUpdateHandle?: (agentId: string, handleLabel: string) => Promise<void> | void;
}
