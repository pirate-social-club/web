"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";

import { getErrorMessage } from "@/lib/error-utils";

export function useCommunityProfileState({
  community,
  setCommunity,
}: {
  community: ApiCommunity | null;
  setCommunity: React.Dispatch<React.SetStateAction<ApiCommunity | null>>;
}) {
  const api = useApi();
  const [profileDisplayName, setProfileDisplayName] = React.useState("");
  const [profileDescription, setProfileDescription] = React.useState("");
  const [profileAvatarFile, setProfileAvatarFile] = React.useState<File | null>(null);
  const [profileBannerFile, setProfileBannerFile] = React.useState<File | null>(null);
  const [profileAvatarRemoved, setProfileAvatarRemoved] = React.useState(false);
  const [profileBannerRemoved, setProfileBannerRemoved] = React.useState(false);
  const [profileDisplayNameError, setProfileDisplayNameError] = React.useState<string | undefined>(undefined);
  const [savingProfile, setSavingProfile] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setProfileDisplayName(community.display_name);
    setProfileDescription(community.description ?? "");
    setProfileAvatarFile(null);
    setProfileBannerFile(null);
    setProfileAvatarRemoved(community.avatar_ref == null);
    setProfileBannerRemoved(community.banner_ref == null);
    setProfileDisplayNameError(undefined);
  }, [community]);

  const profileHasChanges = community == null ? false : (
    profileDisplayName.trim() !== community.display_name.trim()
    || profileDescription !== (community.description ?? "")
    || profileAvatarFile !== null
    || profileBannerFile !== null
    || (profileAvatarRemoved && community.avatar_ref != null)
    || (profileBannerRemoved && community.banner_ref != null)
  );

  const handleSaveProfile = React.useCallback(async () => {
    if (!community || savingProfile) return;
    const trimmedDisplayName = profileDisplayName.trim();
    if (!trimmedDisplayName) {
      setProfileDisplayNameError("Name is required.");
      return;
    }

    setProfileDisplayNameError(undefined);
    setSavingProfile(true);
    try {
      let avatarRef = profileAvatarRemoved ? null : community.avatar_ref ?? null;
      let bannerRef = profileBannerRemoved ? null : community.banner_ref ?? null;

      if (profileAvatarFile) {
        avatarRef = (await api.communities.uploadMedia({ kind: "avatar", file: profileAvatarFile })).media_ref;
      }
      if (profileBannerFile) {
        bannerRef = (await api.communities.uploadMedia({ kind: "banner", file: profileBannerFile })).media_ref;
      }

      const updatedCommunity = await api.communities.update(community.id, {
        display_name: trimmedDisplayName,
        description: profileDescription.trim() ? profileDescription : null,
        avatar_ref: avatarRef,
        banner_ref: bannerRef,
      });
      setCommunity(updatedCommunity);
      setProfileAvatarFile(null);
      setProfileBannerFile(null);
      setProfileAvatarRemoved(updatedCommunity.avatar_ref == null);
      setProfileBannerRemoved(updatedCommunity.banner_ref == null);
      toast.success("Profile saved.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not save profile."));
    } finally {
      setSavingProfile(false);
    }
  }, [
    api.communities,
    community,
    profileAvatarFile,
    profileAvatarRemoved,
    profileBannerFile,
    profileBannerRemoved,
    profileDescription,
    profileDisplayName,
    savingProfile,
    setCommunity,
  ]);

  return {
    handleSaveProfile,
    profileAvatarFile,
    profileAvatarRemoved,
    profileBannerFile,
    profileBannerRemoved,
    profileDescription,
    profileDisplayName,
    profileDisplayNameError,
    profileHasChanges,
    savingProfile,
    setProfileAvatarFile,
    setProfileAvatarRemoved,
    setProfileBannerFile,
    setProfileBannerRemoved,
    setProfileDescription,
    setProfileDisplayName,
    setProfileDisplayNameError,
  };
}
