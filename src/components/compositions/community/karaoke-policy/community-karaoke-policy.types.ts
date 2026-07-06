import type { AssistantProviderKeyStatus } from "../assistant-policy/community-assistant-policy.types";

export interface CommunityKaraokePolicySettings {
  karaokeEnabled: boolean;
  updatedAt: string | null;
}

export type CommunityKaraokePolicySubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityKaraokePolicyPageProps {
  settings: CommunityKaraokePolicySettings;
  submitState: CommunityKaraokePolicySubmitState;
  className?: string;
  elevenLabsKeyStatus?: AssistantProviderKeyStatus;
  onSave?: () => void;
  onSettingsChange?: (settings: CommunityKaraokePolicySettings) => void;
  saveDisabled?: boolean;
}

export function createDefaultKaraokePolicySettings(): CommunityKaraokePolicySettings {
  return {
    karaokeEnabled: false,
    updatedAt: null,
  };
}
