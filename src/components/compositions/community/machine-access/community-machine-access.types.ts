export type MachineAccessSurface =
  | "communityIdentity"
  | "communityStats"
  | "threadCards"
  | "threadBodies"
  | "topComments"
  | "events";

export interface CommunityMachineAccessSettings {
  policyOrigin: "default" | "explicit";
  includedSurfaces: Record<MachineAccessSurface, boolean>;
  topCommentsLimit: number;
  anonymousRateTier: "low";
  authenticatedRateTier: "standard";
}

export type CommunityMachineAccessSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityMachineAccessPageProps {
  settings: CommunityMachineAccessSettings;
  submitState: CommunityMachineAccessSubmitState;
  className?: string;
  onSettingsChange?: (settings: CommunityMachineAccessSettings) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
}

export function createDefaultMachineAccessSettings(): CommunityMachineAccessSettings {
  return {
    policyOrigin: "default",
    includedSurfaces: {
      communityIdentity: true,
      communityStats: true,
      threadCards: true,
      threadBodies: true,
      topComments: true,
      events: true,
    },
    topCommentsLimit: 10,
    anonymousRateTier: "low",
    authenticatedRateTier: "standard",
  };
}
