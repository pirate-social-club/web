import type { UseGlobalHandleFlowReturn } from "@/hooks/use-global-handle-flow";
import type {
  OwnedAgent,
  AgentRegistrationState,
} from "@/components/compositions/owned-agents-panel/owned-agents-panel.types";

export type SettingsTab = "profile" | "preferences" | "agents";

export interface SettingsHandle {
  handleId: string | null;
  kind: "pirate" | "ens";
  label: string;
  metadata?: Record<string, unknown> | null;
  note?: string;
  primary?: boolean;
  verificationState: "verified" | "unverified" | "stale";
}

export interface SettingsLocaleOption {
  label: string;
  value: string;
}

export type SettingsSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface SettingsPageProps {
  activeTab: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  title?: string;
  profile: {
    avatarSrc?: string;
    avatarSource?: "ens" | "upload" | "none" | null;
    bio: string;
    bioSource?: "ens" | "manual" | "none" | null;
    coverSrc?: string;
    coverSource?: "ens" | "upload" | "none" | null;
    currentHandle: string;
    displayName: string;
    displayNameError?: string;
    ensHandleLabel?: string;
    canUseEnsAvatar?: boolean;
    canUseEnsBio?: boolean;
    canUseEnsCover?: boolean;
    linkedHandles: SettingsHandle[];
    primaryHandleId?: string | null;
    pendingAvatarLabel?: string;
    pendingCoverLabel?: string;
    postAuthorLabel: string;
    saveDisabled?: boolean;
    submitState: SettingsSubmitState;
    publicHandlesSubmitState: SettingsSubmitState;
    publicHandlesSaveDisabled?: boolean;
    handleFlow?: Pick<
      UseGlobalHandleFlowReturn,
      "draft" | "preview" | "state" | "setDraft" | "checkAvailability" | "submitRename" | "resetState"
    >;
    onAvatarRemove?: () => void;
    onAvatarSelect?: (file: File | null) => void;
    onAvatarUseEns?: () => void;
    onBioChange?: (value: string) => void;
    onBioUseEns?: () => void;
    onCoverRemove?: () => void;
    onCoverSelect?: (file: File | null) => void;
    onCoverUseEns?: () => void;
    onDisplayNameChange?: (value: string) => void;
    onPrimaryHandleChange?: (handleId: string | null) => void;
    onSave?: () => void;
    onPublicHandlesSave?: () => void;
  };
  preferences: {
    ageStatusLabel?: string;
    locale: string;
    localeOptions: SettingsLocaleOption[];
    nationalityBadgeCountryCode?: string | null;
    nationalityBadgeCountryLabel?: string;
    nationalityBadgeDisabled?: boolean;
    nationalityBadgeEnabled?: boolean;
    saveDisabled?: boolean;
    submitState: SettingsSubmitState;
    onLocaleChange?: (value: string) => void;
    onLogout?: () => void;
    onNationalityBadgeChange?: (enabled: boolean) => void;
    onSave?: () => void;
  };
  agents: {
    items: OwnedAgent[];
    canRegister: boolean;
    loading?: boolean;
    registrationState: AgentRegistrationState;
    importValue?: string;
    onStartPairing?: (handleLabel: string) => void;
    onImportValueChange?: (value: string) => void;
    onImportRegistration?: (handleLabel: string) => void;
    onCheckRegistration?: () => void;
    onDeregister?: (agentId: string) => void;
    onUpdateHandle?: (agentId: string, handleLabel: string) => Promise<void> | void;
    onUpdateName?: (agentId: string, displayName: string) => Promise<void> | void;
  };
}
