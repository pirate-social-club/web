"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";

import { getErrorMessage } from "@/lib/error-utils";
import { normalizeCommunityCountryCode } from "@/lib/geo-country";

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
  const [profileStoreUrl, setProfileStoreUrl] = React.useState("");
  const [profileStoreLabel, setProfileStoreLabel] = React.useState("");
  const [profileCountryCode, setProfileCountryCode] = React.useState("");
  const [profileAccentColor, setProfileAccentColor] = React.useState("");
  const [profileTagline, setProfileTagline] = React.useState("");
  const [profileTheme, setProfileTheme] = React.useState<"system" | "light" | "dark">("system");
  const [profileHeaderStyle, setProfileHeaderStyle] = React.useState<"standard" | "compact" | "immersive">("standard");
  const [profileDefaultSurface, setProfileDefaultSurface] = React.useState<"threads" | "videos">("threads");
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
    setProfileStoreUrl(community.store_url ?? "");
    setProfileStoreLabel(community.store_label ?? "");
    setProfileCountryCode(normalizeCommunityCountryCode(community.country_code));
    setProfileAccentColor(community.branding.accent_color ?? "");
    setProfileTagline(community.branding.tagline ?? "");
    setProfileTheme(community.branding.theme);
    setProfileHeaderStyle(community.branding.header_style);
    setProfileDefaultSurface(community.default_surface);
    setProfileAvatarFile(null);
    setProfileBannerFile(null);
    setProfileAvatarRemoved(community.avatar_ref == null);
    setProfileBannerRemoved(community.banner_ref == null);
    setProfileDisplayNameError(undefined);
  }, [community]);

  const profileHasChanges = community == null ? false : (
    profileDisplayName.trim() !== community.display_name.trim()
    || profileDescription !== (community.description ?? "")
    || profileStoreUrl.trim() !== (community.store_url ?? "")
    || profileStoreLabel.trim() !== (community.store_label ?? "")
    || normalizeCommunityCountryCode(profileCountryCode) !== normalizeCommunityCountryCode(community.country_code)
    || profileAccentColor.trim() !== (community.branding.accent_color ?? "")
    || profileTagline.trim() !== (community.branding.tagline ?? "")
    || profileTheme !== community.branding.theme
    || profileHeaderStyle !== community.branding.header_style
    || profileDefaultSurface !== community.default_surface
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
        store_url: profileStoreUrl.trim() || null,
        store_label: profileStoreLabel.trim() || null,
        country_code: normalizeCommunityCountryCode(profileCountryCode) || null,
      });
      const presentation = await api.communities.updatePresentation(community.id, {
        branding: {
          accent_color: profileAccentColor.trim() || null,
          header_style: profileHeaderStyle,
          tagline: profileTagline.trim() || null,
          theme: profileTheme,
        },
        default_surface: profileDefaultSurface,
      });
      setCommunity({
        ...updatedCommunity,
        branding: presentation.branding,
        default_surface: presentation.default_surface,
      });
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
    profileCountryCode,
    profileAccentColor,
    profileDefaultSurface,
    profileHeaderStyle,
    profileTagline,
    profileTheme,
    profileStoreLabel,
    profileStoreUrl,
    savingProfile,
    setCommunity,
  ]);

  return {
    handleSaveProfile,
    profileAvatarFile,
    profileAvatarRemoved,
    profileBannerFile,
    profileBannerRemoved,
    profileCountryCode,
    profileAccentColor,
    profileDefaultSurface,
    profileHeaderStyle,
    profileTagline,
    profileTheme,
    profileDescription,
    profileDisplayName,
    profileDisplayNameError,
    profileHasChanges,
    profileStoreLabel,
    profileStoreUrl,
    savingProfile,
    setProfileAvatarFile,
    setProfileAvatarRemoved,
    setProfileBannerFile,
    setProfileBannerRemoved,
    setProfileCountryCode,
    setProfileAccentColor,
    setProfileDefaultSurface,
    setProfileHeaderStyle,
    setProfileTagline,
    setProfileTheme,
    setProfileDescription,
    setProfileDisplayName,
    setProfileDisplayNameError,
    setProfileStoreLabel,
    setProfileStoreUrl,
  };
}
