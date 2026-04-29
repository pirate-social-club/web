"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { clearSession, updateSessionProfile, updateSessionUser, useSession } from "@/lib/api/session-store";
import { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, isUiLocaleCode } from "@/lib/ui-locale-core";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countries";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { toast } from "@/components/primitives/sonner";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profiles/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings/settings-page/settings-page";
import type { SettingsSubmitState, SettingsTab } from "@/components/compositions/settings/settings-page/settings-page.types";
import type { ProfileUpdateInput } from "@/lib/api/client-api-types";
import { useVeryVerification } from "@/lib/verification/use-very-verification";

import { AuthRequiredRouteState } from "@/app/authenticated-helpers/route-shell";
import { useRouteMessages } from "@/hooks/use-route-messages";
import {
  apiProfileToProps,
  buildSettingsLocaleOptions,
  buildSettingsPath,
  getSelectedProfileHandleLabel,
  mapProfileLinkedHandles,
} from "@/app/authenticated-helpers/profile-settings-mapping";
import { useSettingsOwnedAgents } from "@/app/authenticated-state/use-settings-owned-agents";

export { CurrentUserWalletPage } from "./wallet-settings-route";
export { CurrentUserSettingsIndexPage } from "./settings-index-route";

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CurrentUserProfilePage() {
  const { copy, localeTag } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const isMobile = useIsMobile();
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
    return <AuthRequiredRouteState description={copy.routeStatus.profile.auth} hideTitleOnMobile title={pageTitle} />;
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, {
        followersLabel: copy.profile.followersLabel,
        followingLabel: copy.profile.followingLabel,
      }, followState, localeTag)}
      onEditProfile={() => {
        handleFlow.clearDraft();
        navigate(isMobile ? "/settings" : buildSettingsPath("profile"));
      }}
    />
  );
}

function getSettingsSectionTitle(
  activeTab: SettingsTab,
  copy: ReturnType<typeof useRouteMessages>["copy"],
): string {
  if (activeTab === "profile") return copy.settings.profileTab;
  if (activeTab === "preferences") return copy.settings.preferencesTab;
  return "Agents";
}

export function CurrentUserSettingsPage({ activeTab }: { activeTab: SettingsTab }) {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const profile = session?.profile ?? null;
  const isMobile = useIsMobile();
  const walletAttachments = session?.walletAttachments ?? [];
  const { locale, setLocale } = useUiLocale();
  const pageTitle = copy.settings.title;
  const sectionTitle = getSettingsSectionTitle(activeTab, copy);
  const syncedPrimaryWalletRef = React.useRef<string | null>(null);
  const hasSession = Boolean(session);
  const hasProfile = Boolean(profile);
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [preferredLocale, setPreferredLocale] = React.useState<UiLocaleCode>("en");
  const [nationalityBadgeEnabled, setNationalityBadgeEnabled] = React.useState(false);
  const [selectedPrimaryHandleId, setSelectedPrimaryHandleId] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = React.useState(false);
  const [coverRemoved, setCoverRemoved] = React.useState(false);
  const [displayNameError, setDisplayNameError] = React.useState<string | undefined>(undefined);
  const [profileSubmitState, setProfileSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [publicHandlesSubmitState, setPublicHandlesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [preferencesSubmitState, setPreferencesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const uniqueHumanState = session?.user.verification_capabilities?.unique_human?.state ?? null;
  const canRegisterAgentByVerification = uniqueHumanState === "verified";
  const {
    startVerification: startAgentOwnerVerification,
    verificationError: agentVerificationError,
  } = useVeryVerification({
    onVerified: async () => {
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);
    },
    verified: canRegisterAgentByVerification,
    verificationIntent: "profile_verification",
  });
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
    canRegisterByVerification: canRegisterAgentByVerification,
    enabled: Boolean(profile && activeTab === "agents"),
    messages: ownedAgentsMessages,
    onStartVerification: () => {
      void startAgentOwnerVerification();
    },
  });

  React.useEffect(() => {
    if (agentVerificationError) {
      toast.error(agentVerificationError, { id: "agent-owner-verification-error" });
    }
  }, [agentVerificationError]);

  React.useEffect(() => {
    if (activeTab !== "agents") return;
    logger.info(`[settings:agents] route hasSession=${hasSession} hasProfile=${hasProfile} uniqueHuman=${uniqueHumanState ?? "none"} canRegisterByVerification=${canRegisterAgentByVerification}`);
  }, [activeTab, canRegisterAgentByVerification, hasProfile, hasSession, uniqueHumanState]);

  React.useEffect(() => {
    if (!profile) return;
    const nextPreferredLocale = profile.preferred_locale;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPreferredLocale(isUiLocaleCode(nextPreferredLocale ?? "") ? nextPreferredLocale as UiLocaleCode : locale);
    setNationalityBadgeEnabled(Boolean(profile.display_verified_nationality_badge));
    setSelectedPrimaryHandleId(profile.primary_public_handle?.linked_handle_id ?? null);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarRemoved(false);
    setCoverRemoved(false);
    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "idle" });
    setPublicHandlesSubmitState({ kind: "idle" });
    setPreferencesSubmitState({ kind: "idle" });
  }, [locale, profile]);

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
  const verifiedEnsHandle = linkedHandles.find((handle) => handle.kind === "ens" && handle.verificationState === "verified") ?? null;
  const ensAvatarRef = metadataString(verifiedEnsHandle?.metadata, "avatar");
  const ensCoverRef = metadataString(verifiedEnsHandle?.metadata, "header");
  const ensBio = metadataString(verifiedEnsHandle?.metadata, "description");
  const postAuthorLabel = profile ? getSelectedProfileHandleLabel(profile, selectedPrimaryHandleId) : currentHandle;
  const settingsLocaleOptions = React.useMemo(() => buildSettingsLocaleOptions(copy), [copy]);
  const verifiedNationality = session?.user.verification_capabilities?.nationality;
  const verifiedNationalityCode = verifiedNationality?.state === "verified" && verifiedNationality.provider === "self"
    ? normalizeCountryCode(verifiedNationality.value)?.alpha2 ?? null
    : null;
  const verifiedNationalityName = verifiedNationalityCode ? getCountryDisplayName(verifiedNationalityCode, locale) : null;
  const effectiveNationalityBadgeEnabled = Boolean(verifiedNationalityCode && nationalityBadgeEnabled);
  const profileHasChanges = profile == null ? false : (
    displayName.trim() !== (profile.display_name ?? "").trim()
    || bio !== (profile.bio ?? "")
    || avatarFile !== null
    || coverFile !== null
    || (avatarRemoved && profile.avatar_ref != null)
    || (coverRemoved && profile.cover_ref != null)
  );
  const publicHandlesHasChanges = profile == null ? false : selectedPrimaryHandleId !== profilePrimaryHandleId;
  const preferencesChanged = profile == null ? false : (
    preferredLocale !== (isUiLocaleCode(profile.preferred_locale ?? "") ? profile.preferred_locale : locale)
    || effectiveNationalityBadgeEnabled !== Boolean(profile.display_verified_nationality_badge)
  );

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
      const payload: ProfileUpdateInput = { display_name: trimmedDisplayName };
      const nextBio = bio.trim() ? bio : null;
      if (nextBio !== (profile.bio ?? null)) {
        payload.bio = nextBio;
      }
      if (avatarRemoved) {
        payload.avatar_source = "none";
      } else if (avatarFile) {
        payload.avatar_ref = (await api.profiles.uploadMedia({ kind: "avatar", file: avatarFile })).media_ref;
      }
      if (coverRemoved) {
        payload.cover_source = "none";
      } else if (coverFile) {
        payload.cover_ref = (await api.profiles.uploadMedia({ kind: "cover", file: coverFile })).media_ref;
      }

      const updatedProfile = await api.profiles.updateMe(payload);

      updateSessionProfile(updatedProfile);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarRemoved(updatedProfile.avatar_ref == null);
      setCoverRemoved(updatedProfile.cover_ref == null);
      setProfileSubmitState({ kind: "idle" });
      toast.success(copy.settings.profileUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
    }
  }, [api, avatarFile, avatarRemoved, bio, copy.settings.displayNameRequired, copy.settings.profileUpdated, copy.settings.saveProfileError, coverFile, coverRemoved, displayName, profile]);

  const handlePublicHandlesSave = React.useCallback(async () => {
    if (!profile) return;
    if (selectedPrimaryHandleId === profilePrimaryHandleId) return;

    setPublicHandlesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.setPrimaryPublicHandle(selectedPrimaryHandleId);
      updateSessionProfile(updatedProfile);
      setSelectedPrimaryHandleId(updatedProfile.primary_public_handle?.linked_handle_id ?? null);
      setPublicHandlesSubmitState({ kind: "idle" });
      toast.success(copy.settings.profileUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPublicHandlesSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
    }
  }, [api, copy.settings.profileUpdated, copy.settings.saveProfileError, profile, profilePrimaryHandleId, selectedPrimaryHandleId]);

  const handlePreferencesSave = React.useCallback(async () => {
    if (!profile) return;
    setPreferencesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.updateMe({
        preferred_locale: preferredLocale,
        display_verified_nationality_badge: effectiveNationalityBadgeEnabled,
      });
      updateSessionProfile(updatedProfile);
      setLocale(preferredLocale);
      setPreferencesSubmitState({ kind: "idle" });
      toast.success(copy.settings.preferencesUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.savePreferencesError });
    }
  }, [api, copy.settings.preferencesUpdated, copy.settings.savePreferencesError, effectiveNationalityBadgeEnabled, preferredLocale, profile, setLocale]);

  const handleLogout = React.useCallback(() => {
    clearSession();
    navigate("/");
  }, []);

  const content = !profile ? (
    <AuthRequiredRouteState description={copy.routeStatus.settings.auth} title={sectionTitle} />
  ) : (
    <SettingsPage
      activeTab={activeTab}
      onTabChange={(tab) => navigate(buildSettingsPath(tab))}
      showSectionNav={!isMobile}
      preferences={{
        ageStatusLabel: session?.user.verification_capabilities?.age_over_18?.state === "verified"
          ? copy.settings.ageVerified
          : copy.settings.notVerified,
        locale: preferredLocale,
        localeOptions: settingsLocaleOptions,
        nationalityBadgeCountryCode: verifiedNationalityCode,
        nationalityBadgeCountryLabel: verifiedNationalityName
          ? copy.settings.nationalityVerified.replace("{country}", verifiedNationalityName)
          : copy.settings.notVerified,
        nationalityBadgeDisabled: !verifiedNationalityCode,
        nationalityBadgeEnabled: effectiveNationalityBadgeEnabled,
        onLocaleChange: (next) => {
          if (isUiLocaleCode(next)) {
            setPreferredLocale(next);
            setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
          }
        },
        onLogout: handleLogout,
        onNationalityBadgeChange: (enabled) => {
          setNationalityBadgeEnabled(enabled);
          setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onSave: handlePreferencesSave,
        saveDisabled: !preferencesChanged || preferencesSubmitState.kind === "saving",
        submitState: preferencesSubmitState,
      }}
      profile={{
        avatarSeed: profile.user_id,
        avatarSrc: avatarRemoved ? undefined : profile.avatar_ref ?? undefined,
        avatarSource: avatarRemoved ? "none" : profile.avatar_source ?? null,
        bio,
        bioSource: bio !== (profile.bio ?? "") ? "manual" : profile.bio_source ?? null,
        canUseEnsAvatar: Boolean(ensAvatarRef),
        canUseEnsBio: Boolean(ensBio),
        canUseEnsCover: Boolean(ensCoverRef),
        coverSrc: coverRemoved ? undefined : profile.cover_ref ?? undefined,
        coverSource: coverRemoved ? "none" : profile.cover_source ?? null,
        currentHandle,
        displayName,
        displayNameError,
        ensHandleLabel: verifiedEnsHandle?.label,
        linkedHandles,
        primaryHandleId: selectedPrimaryHandleId,
        onAvatarRemove: () => { setAvatarFile(null); setAvatarRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onAvatarSelect: (file) => { setAvatarFile(file); setAvatarRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onAvatarUseEns: async () => {
          if (!ensAvatarRef) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ avatar_source: "ens" });
            updateSessionProfile(updatedProfile);
            setAvatarFile(null);
            setAvatarRemoved(false);
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onBioChange: (next) => { setBio(next); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onBioUseEns: async () => {
          if (!ensBio) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ bio_source: "ens" });
            updateSessionProfile(updatedProfile);
            setBio(updatedProfile.bio ?? "");
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onCoverRemove: () => { setCoverFile(null); setCoverRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverSelect: (file) => { setCoverFile(file); setCoverRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverUseEns: async () => {
          if (!ensCoverRef) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ cover_source: "ens" });
            updateSessionProfile(updatedProfile);
            setCoverFile(null);
            setCoverRemoved(false);
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onDisplayNameChange: (next) => { setDisplayName(next); setDisplayNameError(undefined); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onPrimaryHandleChange: (handleId) => { setSelectedPrimaryHandleId(handleId); setPublicHandlesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onSave: handleProfileSave,
        onPublicHandlesSave: handlePublicHandlesSave,
        pendingAvatarLabel: avatarFile?.name,
        pendingCoverLabel: coverFile?.name,
        postAuthorLabel,
        publicHandlesSaveDisabled: !publicHandlesHasChanges || publicHandlesSubmitState.kind === "saving",
        publicHandlesSubmitState,
        saveDisabled: !profileHasChanges || profileSubmitState.kind === "saving",
        submitState: profileSubmitState,
      }}
      title={sectionTitle}
      agents={{ ...agents, showTitle: !isMobile }}
    />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onBackClick={() => navigate("/settings")} title={sectionTitle} />
        <section className="flex min-w-0 flex-1 flex-col py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <div className="min-w-0">
            {content}
          </div>
        </section>
      </div>
    );
  }

  return content;
}
