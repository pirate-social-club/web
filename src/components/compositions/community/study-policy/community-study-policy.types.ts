import type { AssistantProviderKeyStatus } from "../assistant-policy/community-assistant-policy.types";

export interface CommunityStudyPolicySettings {
  studyEnabled: boolean;
  updatedAt: string | null;
}

type CommunityStudyPolicySubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityStudyPolicyPageProps {
  settings: CommunityStudyPolicySettings;
  submitState: CommunityStudyPolicySubmitState;
  className?: string;
  elevenLabsKeyStatus?: AssistantProviderKeyStatus;
  onSave?: () => void;
  onSettingsChange?: (settings: CommunityStudyPolicySettings) => void;
  saveDisabled?: boolean;
}

export function createDefaultStudyPolicySettings(): CommunityStudyPolicySettings {
  return {
    studyEnabled: false,
    updatedAt: null,
  };
}
