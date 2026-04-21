"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { updateSessionProfile, useSession } from "@/lib/api/session-store";
import { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, isUiLocaleCode } from "@/lib/ui-locale-core";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { toast } from "@/components/primitives/sonner";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
import type { SettingsSubmitState, SettingsTab } from "@/components/compositions/settings-page/settings-page.types";

import { getRouteAuthDescription } from "./route-status-copy";
import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "./route-core";
import {
  apiProfileToProps,
  buildSettingsLocaleOptions,
  buildSettingsPath,
  formatWalletChainLabel,
  getSelectedProfileHandleLabel,
  mapProfileLinkedHandles,
} from "./profile-settings-mapping";
import { useSettingsOwnedAgents } from "./use-settings-owned-agents";

export function CurrentUserProfilePage() {
  const { copy, localeTag } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const pageTitle = copy.profile.title;
  logger.info("[profile-page] render", { hasProfile: !!profile, hasSession: !!session });
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
  const ownedAgentsMessages = React.useMemo(() => ({
    agentRegisteredToast: copy.ownedAgents.agentRegisteredToast,
    completeAgentRegistrationError: copy.ownedAgents.completeAgentRegistrationError,
    createPairingError: copy.ownedAgents.createPairingError,
    importInvalidJsonError: copy.ownedAgents.importInvalidJsonError,
    importMissingChallengeError: copy.ownedAgents.importMissingChallengeError,
    importMissingFieldsError: copy.ownedAgents.importMissingFieldsError,
    importRegistrationError: copy.ownedAgents.importRegistrationError,
    missingRegistrationUrlError: copy.ownedAgents.missingRegistrationUrlError,
    ownedAgentsLoadError: copy.ownedAgents.ownedAgentsLoadError,
    ownedAgentsLocalTablesError: copy.ownedAgents.ownedAgentsLocalTablesError,
    registrationIncompleteError: copy.ownedAgents.registrationIncompleteError,
  }), [copy.ownedAgents]);
  const agents = useSettingsOwnedAgents({
    api,
    canRegisterByVerification: session?.user.verification_capabilities?.unique_human?.state === "verified",
    enabled: Boolean(profile && activeTab === "agents"),
    messages: ownedAgentsMessages,
  });

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
        logger.warn("[settings] linked handle sync failed", error);
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
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
    }
  }, [api, avatarFile, avatarRemoved, bio, copy.settings.displayNameRequired, copy.settings.profileUpdated, copy.settings.saveProfileError, coverFile, coverRemoved, displayName, profile, profilePrimaryHandleId, selectedPrimaryHandleId]);

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
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.savePreferencesError });
    }
  }, [api, copy.settings.preferencesUpdated, copy.settings.savePreferencesError, preferredLocale, profile, setLocale]);

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
      agents={agents}
    />
  );
}
