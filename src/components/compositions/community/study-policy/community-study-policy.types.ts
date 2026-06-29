export interface CommunityStudyPolicySettings {
  studyEnabled: boolean;
  updatedAt: string | null;
}

export type CommunityStudyPolicySubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityStudyPolicyPageProps {
  settings: CommunityStudyPolicySettings;
  submitState: CommunityStudyPolicySubmitState;
  className?: string;
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
