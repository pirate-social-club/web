import type { CommunityAssistantPolicySettings } from "../assistant-policy/community-assistant-policy.types";

export type CommunityIntegrationsSettings = Pick<
  CommunityAssistantPolicySettings,
  "elevenLabsKeyStatus" | "openRouterKeyStatus"
>;

export type CommunityIntegrationsPageProps = {
  className?: string;
  onElevenLabsKeyRevoke?: () => void | Promise<void>;
  onElevenLabsKeySave?: (apiKey: string) => void | Promise<void>;
  onOpenRouterKeyRevoke?: () => void | Promise<void>;
  onOpenRouterKeySave?: (apiKey: string) => void | Promise<void>;
  savingCredential?: boolean;
  settings: CommunityIntegrationsSettings;
};
