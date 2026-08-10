"use client";

import type { useCommunityModerationState } from "@/app/authenticated-state/moderation-state";
import { navigate } from "@/app/router";
import { CommunityProfileEditorPage } from "@/components/compositions/community/profile-editor/community-profile-editor-page";

type CommunityModerationState = ReturnType<typeof useCommunityModerationState>;

export function CommunityProfileEditorRoute({
  backPath,
  mobile,
  state,
}: {
  backPath: string;
  mobile: boolean;
  state: CommunityModerationState;
}) {
  return (
    <CommunityProfileEditorPage
      accentColor={state.profileAccentColor}
      avatarSrc={state.profileAvatarRemoved ? undefined : (state.community?.avatar_ref ?? undefined)}
      bannerSrc={state.profileBannerRemoved ? undefined : (state.community?.banner_ref ?? undefined)}
      countryCode={state.profileCountryCode}
      description={state.profileDescription}
      displayName={state.profileDisplayName}
      displayNameError={state.profileDisplayNameError}
      defaultSurface={state.profileDefaultSurface}
      videoFeedEnabled={state.profileVideoFeedEnabled}
      headerStyle={state.profileHeaderStyle}
      onAccentColorChange={state.setProfileAccentColor}
      onAvatarRemove={() => {
        state.setProfileAvatarFile(null);
        state.setProfileAvatarRemoved(true);
      }}
      onAvatarSelect={(file) => {
        state.setProfileAvatarFile(file);
        if (file) state.setProfileAvatarRemoved(false);
      }}
      onBackClick={mobile ? () => navigate(backPath) : undefined}
      onBannerRemove={() => {
        state.setProfileBannerFile(null);
        state.setProfileBannerRemoved(true);
      }}
      onBannerSelect={(file) => {
        state.setProfileBannerFile(file);
        if (file) state.setProfileBannerRemoved(false);
      }}
      onCountryCodeChange={state.setProfileCountryCode}
      onDescriptionChange={state.setProfileDescription}
      onDisplayNameChange={state.setProfileDisplayName}
      onDefaultSurfaceChange={state.setProfileDefaultSurface}
      onHeaderStyleChange={state.setProfileHeaderStyle}
      onSave={state.handleSaveProfile}
      onStoreLabelChange={state.setProfileStoreLabel}
      onStoreUrlChange={state.setProfileStoreUrl}
      onTaglineChange={state.setProfileTagline}
      onThemeChange={state.setProfileTheme}
      onVideoFeedEnabledChange={state.setProfileVideoFeedEnabled}
      pendingAvatarLabel={state.profileAvatarFile?.name}
      pendingBannerLabel={state.profileBannerFile?.name}
      saveDisabled={state.savingProfile || !state.profileHasChanges}
      saveLoading={state.savingProfile}
      storeLabel={state.profileStoreLabel}
      storeUrl={state.profileStoreUrl}
      tagline={state.profileTagline}
      theme={state.profileTheme}
    />
  );
}
