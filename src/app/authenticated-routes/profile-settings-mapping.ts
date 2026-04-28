import type { Profile as ApiProfile, UserAgent as ApiUserAgent } from "@pirate/api-contracts";

import { ApiError } from "@/lib/api/client";
import type { SettingsHandle, SettingsPageProps, SettingsTab } from "@/components/compositions/settings-page/settings-page.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/post-card/post-card-nationality";
import { resolveProfileCoverSrc } from "@/lib/default-profile-cover";
import { formatProfileDisplayHandle } from "@/lib/profile-routing";

export type PendingAgentRegistration = {
  sessionId: string;
  handleLabel: string;
  displayName: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

export type ImportedOpenClawBundle = {
  display_name?: string;
  public_key_pem: string;
  private_key_pem: string;
  agent_challenge: {
    device_id: string;
    public_key: string;
    message: string;
    signature: string;
    timestamp: number;
  };
};

type SettingsLocaleCopy = {
  settings: {
    localeArabic: string;
    localeEnglish: string;
    localeMandarin: string;
    localePseudo: string;
  };
};

type ProfileLabels = {
  followersLabel: string;
  followingLabel: string;
  joinedStatLabel: string;
};

type ProfileFollowState = {
  followerCount: string | number | null;
  followingCount: string | number;
  followBusy: boolean;
  followDisabled: boolean;
  followLoading: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
};

export type AgentRegistrationMessages = {
  importInvalidJsonError: string;
  importMissingChallengeError: string;
  importMissingFieldsError: string;
  ownedAgentsLoadError: string;
  ownedAgentsLocalTablesError: string;
};

export function buildSettingsLocaleOptions(copy: SettingsLocaleCopy) {
  return [
    { label: copy.settings.localeEnglish, value: "en" as const },
    { label: copy.settings.localeArabic, value: "ar" as const },
    { label: copy.settings.localeMandarin, value: "zh" as const },
    { label: copy.settings.localePseudo, value: "pseudo" as const },
  ];
}

export function apiProfileToProps(
  profile: ApiProfile,
  ownProfile: boolean,
  labels: ProfileLabels,
  followState: ProfileFollowState,
  localeTag: string,
) {
  const handle = profile.primary_public_handle?.label ?? profile.global_handle?.label ?? "";
  const displayHandle = formatProfileDisplayHandle(handle);
  const displayName = profile.display_name ?? displayHandle;
  const bannerSrc = resolveProfileCoverSrc({
    coverSrc: profile.cover_ref,
    displayName,
    handle,
    userId: profile.user_id,
  });

  return {
    profile: {
      displayName,
      handle: displayHandle,
      bio: profile.bio ?? "",
      avatarSrc: profile.avatar_ref ?? undefined,
      nationalityBadgeCountryCode: profile.nationality_badge_country ?? undefined,
      nationalityBadgeLabel: profile.nationality_badge_country ? buildNationalityBadgeLabel(profile.nationality_badge_country, localeTag) : undefined,
      bannerSrc,
      meta: [],
      viewerContext: ownProfile ? ("self" as const) : ("public" as const),
      viewerFollows: followState.isFollowing,
      canMessage: !ownProfile,
      followBusy: followState.followBusy,
      followDisabled: followState.followDisabled || followState.followLoading,
      followLoading: followState.followLoading,
      onToggleFollow: followState.onToggleFollow,
    },
    rightRail: {
      stats: [
        { label: labels.followersLabel, value: followState.followerCount ?? "—" },
        { label: labels.followingLabel, value: followState.followingCount },
        { label: labels.joinedStatLabel, value: new Date(profile.created_at).toLocaleDateString(localeTag, { month: "short", year: "numeric" }) },
      ],
      description: profile.bio ?? undefined,
      walletAddress: profile.primary_wallet_address ?? undefined,
    },
    overviewItems: [],
    posts: [],
    comments: [],
    scrobbles: [],
  };
}

export function mapProfileLinkedHandles(profile: ApiProfile): SettingsHandle[] {
  const linkedHandles = profile.linked_handles ?? [{
    linked_handle_id: `global:${profile.global_handle.global_handle_id}`,
    label: profile.global_handle.label,
    kind: "pirate" as const,
    verification_state: "verified" as const,
  }];
  const primaryLinkedHandleId = profile.primary_public_handle?.linked_handle_id ?? null;

  return linkedHandles.map((handle) => ({
    handleId: handle.kind === "pirate" ? null : handle.linked_handle_id,
    kind: handle.kind,
    label: handle.label,
    metadata: handle.metadata ?? null,
    primary: handle.kind === "pirate" ? primaryLinkedHandleId == null : primaryLinkedHandleId === handle.linked_handle_id,
    verificationState: handle.verification_state,
  }));
}

export function getSelectedProfileHandleLabel(profile: ApiProfile, linkedHandleId: string | null): string {
  if (linkedHandleId == null) return profile.global_handle.label;
  return profile.linked_handles?.find((handle) => handle.linked_handle_id === linkedHandleId)?.label
    ?? profile.primary_public_handle?.label
    ?? profile.global_handle.label;
}

export function buildSettingsPath(tab: SettingsTab): string {
  return `/settings/${tab}`;
}

export function formatWalletChainLabel(chainNamespace: string): string {
  switch (chainNamespace) {
    case "eip155:1":
      return "Ethereum";
    case "eip155:8453":
      return "Base";
    default:
      return chainNamespace;
  }
}

export function normalizeAgentHandleInput(value: string): string {
  return value.trim().toLowerCase().replace(/\.clawitzer$/i, "");
}

export function displayNameFromAgentHandle(value: string): string {
  const normalized = normalizeAgentHandleInput(value);
  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || normalized;
}

export function mapApiUserAgentToOwnedAgent(agent: ApiUserAgent): SettingsPageProps["agents"]["items"][number] {
  return {
    agentId: agent.agent_id,
    displayName: agent.display_name,
    handleLabel: agent.handle?.label_display ?? null,
    status: agent.status,
    createdAt: agent.created_at,
    currentOwnership: agent.current_ownership
      ? {
        ownershipProvider: agent.current_ownership.ownership_provider,
        verifiedAt: agent.current_ownership.verified_at ?? agent.created_at,
        expiresAt: agent.current_ownership.expires_at ?? null,
      }
      : null,
  };
}

export function parseImportedOpenClawBundle(
  raw: string,
  messages: Pick<AgentRegistrationMessages, "importInvalidJsonError" | "importMissingChallengeError" | "importMissingFieldsError">,
): ImportedOpenClawBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(messages.importInvalidJsonError);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(messages.importInvalidJsonError);
  }

  const bundle = parsed as Record<string, unknown>;
  const challenge = bundle.agent_challenge;
  if (!challenge || typeof challenge !== "object") {
    throw new Error(messages.importMissingChallengeError);
  }

  const agentChallenge = challenge as Record<string, unknown>;
  if (
    typeof bundle.public_key_pem !== "string"
    || typeof bundle.private_key_pem !== "string"
    || typeof agentChallenge.device_id !== "string"
    || typeof agentChallenge.public_key !== "string"
    || typeof agentChallenge.message !== "string"
    || typeof agentChallenge.signature !== "string"
    || typeof agentChallenge.timestamp !== "number"
  ) {
    throw new Error(messages.importMissingFieldsError);
  }

  return {
    display_name: typeof bundle.display_name === "string" ? bundle.display_name : undefined,
    public_key_pem: bundle.public_key_pem,
    private_key_pem: bundle.private_key_pem,
    agent_challenge: {
      device_id: agentChallenge.device_id,
      public_key: agentChallenge.public_key,
      message: agentChallenge.message,
      signature: agentChallenge.signature,
      timestamp: agentChallenge.timestamp,
    },
  };
}

export function formatOwnedAgentsLoadError(
  error: unknown,
  messages: Pick<AgentRegistrationMessages, "ownedAgentsLoadError" | "ownedAgentsLocalTablesError">,
): string {
  if (!(error instanceof ApiError)) {
    return messages.ownedAgentsLoadError;
  }

  if (error.message.includes("no such table: user_agents")) {
    return messages.ownedAgentsLocalTablesError;
  }

  return error.message;
}
