"use client";

import * as React from "react";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { updateSessionProfile, useSession } from "@/lib/api/session-store";
import { isApiAuthError, type ApiError } from "@/lib/api/client";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, isUiLocaleCode } from "@/lib/ui-locale-core";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { toast } from "@/components/primitives/sonner";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
import type { SettingsHandle, SettingsSubmitState, SettingsTab } from "@/components/compositions/settings-page/settings-page.types";

import { getRouteAuthDescription, getRouteTitle } from "./route-status-copy";
import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "./route-core";

const SETTINGS_LOCALE_OPTIONS: Array<{ label: string; value: UiLocaleCode }> = [
  { label: "English", value: "en" },
  { label: "Arabic", value: "ar" },
  { label: "Pseudo", value: "pseudo" },
];

function apiProfileToProps(
  profile: ApiProfile,
  ownProfile: boolean,
  joinedStatLabel: string,
  followState: ReturnType<typeof useProfileFollowState>,
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
        { label: "Followers", value: followState.followerCount ?? "—" },
        { label: "Following", value: followState.followingCount },
        { label: joinedStatLabel, value: new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
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

export function CurrentUserProfilePage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const pageTitle = getRouteTitle("profile") ?? "Profile";
  const followState = useProfileFollowState(profile?.primary_wallet_address ?? null, true);
  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      toast.success("Handle updated");
    },
  });

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("profile")} title={pageTitle} />;
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, copy.common.joinedStatLabel, followState)}
      onEditProfile={() => {
        handleFlow.clearDraft();
        navigate(buildSettingsPath("profile"));
      }}
    />
  );
}

export function CurrentUserSettingsPage({ activeTab }: { activeTab: SettingsTab }) {
  const api = useApi();
  const session = useSession();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const { locale, setLocale } = useUiLocale();
  const pageTitle = getRouteTitle("settings") ?? "Settings";
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
      toast.success("Handle updated");
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
      setDisplayNameError("Display name is required.");
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
      toast.success("Profile updated");
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save profile." });
    }
  }, [api, avatarFile, avatarRemoved, bio, coverFile, coverRemoved, displayName, profile, profilePrimaryHandleId, selectedPrimaryHandleId]);

  const handlePreferencesSave = React.useCallback(async () => {
    if (!profile) return;
    setPreferencesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.updateMe({ preferred_locale: preferredLocale });
      updateSessionProfile(updatedProfile);
      setLocale(preferredLocale);
      setPreferencesSubmitState({ kind: "idle" });
      toast.success("Preferences updated");
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save preferences." });
    }
  }, [api, preferredLocale, profile, setLocale]);

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("settings")} title={pageTitle} />;
  }

  return (
    <SettingsPage
      activeTab={activeTab}
      onTabChange={(tab) => navigate(buildSettingsPath(tab))}
      preferences={{
        ageStatusLabel: session?.user.verification_capabilities?.age_over_18?.state === "verified" ? "18+ verified" : "Not verified",
        locale: preferredLocale,
        localeOptions: SETTINGS_LOCALE_OPTIONS,
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
    />
  );
}
