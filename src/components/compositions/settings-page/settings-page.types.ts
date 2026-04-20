import type { UseGlobalHandleFlowReturn } from "@/hooks/use-global-handle-flow";
import type {
  OwnedAgent,
  AgentRegistrationState,
} from "@/components/compositions/owned-agents-panel/owned-agents-panel.types";

export type SettingsTab = "profile" | "wallet" | "preferences" | "agents";

export interface SettingsHandle {
  handleId: string | null;
  kind: "pirate" | "ens";
  label: string;
  note?: string;
  primary?: boolean;
  verificationState: "verified" | "unverified" | "stale";
}

export interface SettingsConnectedWallet {
  address: string;
  chainLabel: string;
  isPrimary?: boolean;
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
    bio: string;
    coverSrc?: string;
    currentHandle: string;
    displayName: string;
    displayNameError?: string;
    linkedHandles: SettingsHandle[];
    primaryHandleId?: string | null;
    pendingAvatarLabel?: string;
    pendingCoverLabel?: string;
    postAuthorLabel: string;
    saveDisabled?: boolean;
    submitState: SettingsSubmitState;
    handleFlow?: Pick<
      UseGlobalHandleFlowReturn,
      "draft" | "preview" | "state" | "setDraft" | "checkAvailability" | "submitRename" | "resetState"
    >;
    onAvatarRemove?: () => void;
    onAvatarSelect?: (file: File | null) => void;
    onBioChange?: (value: string) => void;
    onCoverRemove?: () => void;
    onCoverSelect?: (file: File | null) => void;
    onDisplayNameChange?: (value: string) => void;
    onPrimaryHandleChange?: (handleId: string | null) => void;
    onSave?: () => void;
  };
  wallet: {
    connectedWallets: SettingsConnectedWallet[];
    primaryAddress?: string;
  };
  preferences: {
    ageStatusLabel?: string;
    locale: string;
    localeOptions: SettingsLocaleOption[];
    saveDisabled?: boolean;
    submitState: SettingsSubmitState;
    onLocaleChange?: (value: string) => void;
    onSave?: () => void;
  };
  agents: {
    items: OwnedAgent[];
    canRegister: boolean;
    loading?: boolean;
    registrationState: AgentRegistrationState;
    importValue?: string;
    onStartPairing?: () => void;
    onImportValueChange?: (value: string) => void;
    onImportRegistration?: () => void;
    onCheckRegistration?: () => void;
    onDeregister?: (agentId: string) => void;
  };
}
