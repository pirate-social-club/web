"use client";

import * as React from "react";
import type { Profile as ApiProfile, UserAgent as ApiUserAgent } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { updateSessionProfile, useSession } from "@/lib/api/session-store";
import { ApiError } from "@/lib/api/client";
import { findStoredOwnedAgentKey, saveStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, isUiLocaleCode } from "@/lib/ui-locale-core";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { toast } from "@/components/primitives/sonner";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
import type { SettingsHandle, SettingsPageProps, SettingsSubmitState, SettingsTab } from "@/components/compositions/settings-page/settings-page.types";

import { getRouteAuthDescription } from "./route-status-copy";
import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "./route-core";

type PendingAgentRegistration = {
  sessionId: string;
  displayName: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

type ImportedOpenClawBundle = {
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

function buildSettingsLocaleOptions(copy: ReturnType<typeof useRouteMessages>["copy"]) {
  return [
    { label: copy.settings.localeEnglish, value: "en" as const },
    { label: copy.settings.localeArabic, value: "ar" as const },
    { label: copy.settings.localeMandarin, value: "zh" as const },
    { label: copy.settings.localePseudo, value: "pseudo" as const },
  ];
}

function apiProfileToProps(
  profile: ApiProfile,
  ownProfile: boolean,
  labels: {
    followersLabel: string;
    followingLabel: string;
    joinedStatLabel: string;
  },
  followState: ReturnType<typeof useProfileFollowState>,
  localeTag: string,
) {
  const handle = profile.primary_public_handle?.label ?? profile.global_handle?.label ?? "";

  return {
    profile: {
      displayName: profile.display_name ?? handle,
      handle,
      bio: profile.bio ?? "",
      avatarSrc: profile.avatar_ref ?? undefined,
      bannerSrc: profile.cover_ref ?? undefined,
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
      walletAddress: profile.primary_wallet_address ?? undefined,
    },
    overviewItems: [],
    posts: [],
    comments: [],
    scrobbles: [],
  };
}

function mapProfileLinkedHandles(profile: ApiProfile): SettingsHandle[] {
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
    primary: handle.kind === "pirate" ? primaryLinkedHandleId == null : primaryLinkedHandleId === handle.linked_handle_id,
    verificationState: handle.verification_state,
  }));
}

function getSelectedProfileHandleLabel(profile: ApiProfile, linkedHandleId: string | null): string {
  if (linkedHandleId == null) return profile.global_handle.label;
  return profile.linked_handles?.find((handle) => handle.linked_handle_id === linkedHandleId)?.label
    ?? profile.primary_public_handle?.label
    ?? profile.global_handle.label;
}

function buildSettingsPath(tab: SettingsTab): string {
  return `/settings/${tab}`;
}

function formatWalletChainLabel(chainNamespace: string): string {
  switch (chainNamespace) {
    case "eip155:1":
      return "Ethereum";
    case "eip155:8453":
      return "Base";
    default:
      return chainNamespace;
  }
}

function mapApiUserAgentToOwnedAgent(agent: ApiUserAgent): SettingsPageProps["agents"]["items"][number] {
  return {
    agentId: agent.agent_id,
    displayName: agent.display_name,
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

function parseImportedOpenClawBundle(raw: string): ImportedOpenClawBundle {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Import payload must be valid JSON.");
  }

  const bundle = parsed as Record<string, unknown>;
  const challenge = bundle.agent_challenge;
  if (!challenge || typeof challenge !== "object") {
    throw new Error("Import payload must include agent_challenge.");
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
    throw new Error("Import payload is missing required OpenClaw fields.");
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

function formatOwnedAgentsLoadError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Could not load agents."
  }

  if (error.message.includes("no such table: user_agents")) {
    return "Local API is missing agent tables. Restart pirate-api dev server."
  }

  return error.message
}

export function CurrentUserProfilePage() {
  const { copy, localeTag } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const pageTitle = copy.profile.title;
  const followState = useProfileFollowState(profile?.primary_wallet_address ?? null, true);
  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      toast.success(copy.profile.handleUpdated);
    },
  });

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("profile")} title={pageTitle} />;
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, {
        followersLabel: copy.profile.followersLabel,
        followingLabel: copy.profile.followingLabel,
        joinedStatLabel: copy.common.joinedStatLabel,
      }, followState, localeTag)}
      onEditProfile={() => {
        handleFlow.clearDraft();
        navigate(buildSettingsPath("profile"));
      }}
    />
  );
}

export function CurrentUserSettingsPage({ activeTab }: { activeTab: SettingsTab }) {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const { locale, setLocale } = useUiLocale();
  const pageTitle = copy.settings.title;
  const syncedPrimaryWalletRef = React.useRef<string | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [preferredLocale, setPreferredLocale] = React.useState<UiLocaleCode>("en");
  const [selectedPrimaryHandleId, setSelectedPrimaryHandleId] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = React.useState(false);
  const [coverRemoved, setCoverRemoved] = React.useState(false);
  const [displayNameError, setDisplayNameError] = React.useState<string | undefined>(undefined);
  const [profileSubmitState, setProfileSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [preferencesSubmitState, setPreferencesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [ownedAgents, setOwnedAgents] = React.useState<SettingsPageProps["agents"]["items"]>([]);
  const [agentsLoading, setAgentsLoading] = React.useState(false);
  const [agentsState, setAgentsState] = React.useState<SettingsPageProps["agents"]["registrationState"]>({ kind: "idle" });
  const [agentImportValue, setAgentImportValue] = React.useState("");
  const pendingAgentRegistrationRef = React.useRef<PendingAgentRegistration | null>(null);
  const pendingPairingDisplayNameRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    const nextPreferredLocale = profile.preferred_locale;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPreferredLocale(isUiLocaleCode(nextPreferredLocale ?? "") ? nextPreferredLocale as UiLocaleCode : locale);
    setSelectedPrimaryHandleId(profile.primary_public_handle?.linked_handle_id ?? null);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarRemoved(false);
    setCoverRemoved(false);
    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "idle" });
    setPreferencesSubmitState({ kind: "idle" });
  }, [locale, profile]);

  const loadOwnedAgents = React.useCallback(async (input?: { cancelled?: () => boolean }) => {
    setAgentsLoading(true);
    try {
      const result = await api.agents.list();
      if (input?.cancelled?.()) return;
      const items = result.items.map(mapApiUserAgentToOwnedAgent);
      setOwnedAgents(items);
      return items;
    } finally {
      if (!input?.cancelled?.()) {
        setAgentsLoading(false);
      }
    }
  }, [api]);

  React.useEffect(() => {
    if (!profile || activeTab !== "agents") {
      return;
    }

    let cancelled = false;
    setOwnedAgents([]);
    setAgentsState({ kind: "idle" });

    void loadOwnedAgents({ cancelled: () => cancelled })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn("[settings] owned agents load failed", error);
        setAgentsState({
          kind: "error",
          message: formatOwnedAgentsLoadError(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadOwnedAgents, profile]);

  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      const refreshedProfile = await api.profiles.getMe();
      updateSessionProfile(refreshedProfile);
      toast.success(copy.profile.handleUpdated);
    },
  });

  React.useEffect(() => {
    if (!profile || activeTab !== "profile") return;
    const primaryWalletAttachmentId = session?.user.primary_wallet_attachment_id ?? null;
    const hasEthereumWallet = walletAttachments.some((wallet) => wallet.chain_namespace === "eip155:1");
    if (!primaryWalletAttachmentId || !hasEthereumWallet) return;

    const syncKey = `${profile.user_id}:${primaryWalletAttachmentId}`;
    if (syncedPrimaryWalletRef.current === syncKey) return;

    syncedPrimaryWalletRef.current = syncKey;
    let cancelled = false;
    void api.profiles.syncLinkedHandles()
      .then((updatedProfile) => {
        if (cancelled) return;
        updateSessionProfile(updatedProfile);
        setSelectedPrimaryHandleId(updatedProfile.primary_public_handle?.linked_handle_id ?? null);
      })
      .catch((error: unknown) => {
        console.warn("[settings] linked handle sync failed", error);
      });

    return () => { cancelled = true; };
  }, [activeTab, api, profile, session?.user.primary_wallet_attachment_id, walletAttachments]);

  const profilePrimaryHandleId = profile?.primary_public_handle?.linked_handle_id ?? null;
  const currentHandle = profile?.global_handle?.label ? profile.global_handle.label.replace(/\.pirate$/i, "").concat(".pirate") : "";
  const linkedHandles = profile ? mapProfileLinkedHandles(profile) : [];
  const postAuthorLabel = profile ? getSelectedProfileHandleLabel(profile, selectedPrimaryHandleId) : currentHandle;
  const settingsLocaleOptions = React.useMemo(() => buildSettingsLocaleOptions(copy), [copy]);
  const profileHasChanges = profile == null ? false : (
    displayName.trim() !== (profile.display_name ?? "").trim()
    || bio !== (profile.bio ?? "")
    || avatarFile !== null
    || coverFile !== null
    || (avatarRemoved && profile.avatar_ref != null)
    || (coverRemoved && profile.cover_ref != null)
    || selectedPrimaryHandleId !== profilePrimaryHandleId
  );
  const preferencesChanged = profile == null ? false : preferredLocale !== (isUiLocaleCode(profile.preferred_locale ?? "") ? profile.preferred_locale : locale);

  const handleProfileSave = React.useCallback(async () => {
    if (!profile) return;
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setDisplayNameError(copy.settings.displayNameRequired);
      return;
    }

    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "saving" });
    try {
      let avatarRef = avatarRemoved ? null : profile.avatar_ref ?? null;
      let coverRef = coverRemoved ? null : profile.cover_ref ?? null;
      if (avatarFile) avatarRef = (await api.profiles.uploadMedia({ kind: "avatar", file: avatarFile })).media_ref;
      if (coverFile) coverRef = (await api.profiles.uploadMedia({ kind: "cover", file: coverFile })).media_ref;

      const updatedProfile = await api.profiles.updateMe({
        display_name: trimmedDisplayName,
        bio: bio.trim() ? bio : null,
        avatar_ref: avatarRef,
        cover_ref: coverRef,
      });
      const finalProfile = selectedPrimaryHandleId !== profilePrimaryHandleId
        ? await api.profiles.setPrimaryPublicHandle(selectedPrimaryHandleId)
        : updatedProfile;

      updateSessionProfile(finalProfile);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarRemoved(finalProfile.avatar_ref == null);
      setCoverRemoved(finalProfile.cover_ref == null);
      setSelectedPrimaryHandleId(finalProfile.primary_public_handle?.linked_handle_id ?? null);
      setProfileSubmitState({ kind: "idle" });
      toast.success(copy.settings.profileUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save profile." });
    }
  }, [api, avatarFile, avatarRemoved, bio, copy.settings.displayNameRequired, copy.settings.profileUpdated, coverFile, coverRemoved, displayName, profile, profilePrimaryHandleId, selectedPrimaryHandleId]);

  const handlePreferencesSave = React.useCallback(async () => {
    if (!profile) return;
    setPreferencesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.updateMe({ preferred_locale: preferredLocale });
      updateSessionProfile(updatedProfile);
      setLocale(preferredLocale);
      setPreferencesSubmitState({ kind: "idle" });
      toast.success(copy.settings.preferencesUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save preferences." });
    }
  }, [api, copy.settings.preferencesUpdated, preferredLocale, profile, setLocale]);

  const completePendingAgentRegistration = React.useCallback(async (input?: { silent?: boolean }) => {
    const pendingRegistration = pendingAgentRegistrationRef.current;
    if (!pendingRegistration) {
      return;
    }

    try {
      const completedSession = await api.agents.completeOwnershipSession(pendingRegistration.sessionId, {});

      if (completedSession.status === "verified" && completedSession.agent_id) {
        const now = new Date().toISOString();
        await saveStoredOwnedAgentKey({
          agentId: completedSession.agent_id,
          displayName: pendingRegistration.displayName,
          ownershipProvider: "clawkey",
          publicKeyPem: pendingRegistration.publicKeyPem,
          privateKeyPem: pendingRegistration.privateKeyPem,
          createdAt: now,
          updatedAt: now,
        });
        pendingAgentRegistrationRef.current = null;
        await loadOwnedAgents();
        setAgentsState({ kind: "idle" });
        toast.success("Agent registered");
        return;
      }

      if (completedSession.status === "failed" || completedSession.status === "expired" || completedSession.status === "cancelled") {
        pendingAgentRegistrationRef.current = null;
        setAgentsState({
          kind: "error",
          message: "Agent registration did not complete.",
        });
      }
    } catch (error: unknown) {
      if (input?.silent) {
        return;
      }
      const apiError = error as ApiError;
      setAgentsState({
        kind: "error",
        message: apiError?.message ?? "Could not complete agent registration.",
      });
    }
  }, [api.agents, loadOwnedAgents]);

  const handleUpdateAgentName = React.useCallback(async (agentId: string, nextDisplayName: string) => {
    const updatedAgent = await api.agents.update(agentId, {
      display_name: nextDisplayName.trim(),
    });

    setOwnedAgents((current) => current.map((agent) => (
      agent.agentId === updatedAgent.agent_id ? mapApiUserAgentToOwnedAgent(updatedAgent) : agent
    )));

    const storedKey = await findStoredOwnedAgentKey(agentId);
    if (storedKey) {
      await saveStoredOwnedAgentKey({
        ...storedKey,
        displayName: updatedAgent.display_name,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [api.agents]);

  React.useEffect(() => {
    if (agentsState.kind !== "awaiting_owner" && agentsState.kind !== "pairing_code") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (agentsState.kind === "awaiting_owner") {
        void completePendingAgentRegistration({ silent: true });
      }
      void loadOwnedAgents()
        .then(async (items) => {
          const activeAgent = items?.find((agent) => agent.status === "active");
          if (activeAgent && pendingPairingDisplayNameRef.current?.trim()) {
            const pendingDisplayName = pendingPairingDisplayNameRef.current.trim();
            if (activeAgent.displayName !== pendingDisplayName) {
              await handleUpdateAgentName(activeAgent.agentId, pendingDisplayName);
              await loadOwnedAgents();
            }
            pendingPairingDisplayNameRef.current = null;
          }

          if (activeAgent) {
            pendingAgentRegistrationRef.current = null;
            setAgentsState({ kind: "idle" });
          }
        })
        .catch((error: unknown) => {
          console.warn("[settings] agent pairing poll failed", error);
        });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [agentsState, completePendingAgentRegistration, handleUpdateAgentName, loadOwnedAgents]);

  const handleStartAgentPairing = React.useCallback(async (displayName: string) => {
    setAgentsState({ kind: "verifying" });
    pendingPairingDisplayNameRef.current = displayName.trim();
    try {
      const pairing = await api.agents.createPairing();
      setAgentsState({
        kind: "pairing_code",
        pairingCode: pairing.pairing_code,
        expiresAt: pairing.expires_at,
      });
    } catch (error: unknown) {
      pendingPairingDisplayNameRef.current = null;
      const apiError = error as ApiError;
      setAgentsState({
        kind: "error",
        message: apiError?.message ?? "Could not create pairing code.",
      });
    }
  }, [api.agents]);

  const startAgentRegistration = React.useCallback(async (input: {
    agentChallenge: ImportedOpenClawBundle["agent_challenge"];
    displayName: string;
    privateKeyPem: string;
    publicKeyPem: string;
  }) => {
    const sessionResult = await api.agents.startOwnershipSession({
      session_kind: "register",
      ownership_provider: "clawkey",
      display_name: input.displayName,
      agent_challenge: input.agentChallenge,
    });

    const launch = sessionResult.launch?.clawkey_registration;
    if (!launch) {
      throw new Error("ClawKey registration URL was not returned");
    }

    pendingAgentRegistrationRef.current = {
      sessionId: sessionResult.agent_ownership_session_id,
      displayName: input.displayName,
      publicKeyPem: input.publicKeyPem,
      privateKeyPem: input.privateKeyPem,
    };

    setAgentsState({
      kind: "awaiting_owner",
      registrationUrl: launch.registration_url,
      sessionId: launch.session_id,
      expiresAt: launch.expires_at ?? null,
    });
  }, [api.agents]);

  const handleImportAgentRegistration = React.useCallback(async (displayName: string) => {
    if (!profile) return;

    setAgentsState({ kind: "verifying" });

    try {
      const importedBundle = parseImportedOpenClawBundle(agentImportValue);

      await startAgentRegistration({
        agentChallenge: importedBundle.agent_challenge,
        displayName,
        publicKeyPem: importedBundle.public_key_pem,
        privateKeyPem: importedBundle.private_key_pem,
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setAgentsState({
        kind: "error",
        message: apiError?.message ?? (error instanceof Error ? error.message : "Could not import OpenClaw registration."),
      });
      pendingAgentRegistrationRef.current = null;
    }
  }, [agentImportValue, profile, startAgentRegistration]);

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("settings")} title={pageTitle} />;
  }

  return (
    <SettingsPage
      activeTab={activeTab}
      onTabChange={(tab) => navigate(buildSettingsPath(tab))}
      preferences={{
        ageStatusLabel: session?.user.verification_capabilities?.age_over_18?.state === "verified"
          ? copy.settings.ageVerified
          : copy.settings.notVerified,
        locale: preferredLocale,
        localeOptions: settingsLocaleOptions,
        onLocaleChange: (next) => {
          if (isUiLocaleCode(next)) {
            setPreferredLocale(next);
            setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
          }
        },
        onSave: handlePreferencesSave,
        saveDisabled: !preferencesChanged || preferencesSubmitState.kind === "saving",
        submitState: preferencesSubmitState,
      }}
      profile={{
        avatarSrc: avatarRemoved ? undefined : profile.avatar_ref ?? undefined,
        bio,
        coverSrc: coverRemoved ? undefined : profile.cover_ref ?? undefined,
        currentHandle,
        displayName,
        displayNameError,
        handleFlow,
        linkedHandles,
        primaryHandleId: selectedPrimaryHandleId,
        onAvatarRemove: () => { setAvatarFile(null); setAvatarRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onAvatarSelect: (file) => { setAvatarFile(file); setAvatarRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onBioChange: (next) => { setBio(next); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverRemove: () => { setCoverFile(null); setCoverRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverSelect: (file) => { setCoverFile(file); setCoverRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onDisplayNameChange: (next) => { setDisplayName(next); setDisplayNameError(undefined); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onPrimaryHandleChange: (handleId) => { setSelectedPrimaryHandleId(handleId); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onSave: handleProfileSave,
        pendingAvatarLabel: avatarFile?.name,
        pendingCoverLabel: coverFile?.name,
        postAuthorLabel,
        saveDisabled: !profileHasChanges || profileSubmitState.kind === "saving",
        submitState: profileSubmitState,
      }}
      title={pageTitle}
      wallet={{
        connectedWallets: walletAttachments.map((wallet) => ({
          address: wallet.wallet_address,
          chainLabel: formatWalletChainLabel(wallet.chain_namespace),
          isPrimary: wallet.is_primary,
        })),
        primaryAddress: profile.primary_wallet_address ?? undefined,
      }}
      agents={{
        items: ownedAgents,
        canRegister: !agentsLoading
          && session?.user.verification_capabilities?.unique_human?.state === "verified"
          && !ownedAgents.some((agent) => agent.status === "active"),
        importValue: agentImportValue,
        loading: agentsLoading,
        registrationState: agentsState,
        onStartPairing: (nextDisplayName) => {
          void handleStartAgentPairing(nextDisplayName);
        },
        onImportRegistration: (nextDisplayName) => {
          void handleImportAgentRegistration(nextDisplayName);
        },
        onImportValueChange: setAgentImportValue,
        onCheckRegistration: () => {
          void completePendingAgentRegistration();
        },
        onUpdateName: (agentId, nextDisplayName) => handleUpdateAgentName(agentId, nextDisplayName),
      }}
    />
  );
}
