import type { AgentOwnershipProvider } from "@pirate/api-contracts";

export type AgentPostingPolicy = "disallow" | "allow";
export type AgentPostingScope = "replies_only" | "top_level_and_replies";
export type { AgentOwnershipProvider };

export interface CommunityAgentPolicySettings {
  agentPostingPolicy: AgentPostingPolicy;
  agentPostingScope: AgentPostingScope;
  acceptedAgentOwnershipProviders: AgentOwnershipProvider[];
  dailyPostCap: number | null;
  dailyReplyCap: number | null;
}

export type CommunityAgentPolicySubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityAgentPolicyPageProps {
  settings: CommunityAgentPolicySettings;
  submitState: CommunityAgentPolicySubmitState;
  className?: string;
  onSettingsChange?: (settings: CommunityAgentPolicySettings) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
}
