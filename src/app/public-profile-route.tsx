"use client";

import * as React from "react";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import { useUiLocale, resolveLocaleLanguageTag } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { buildPublicProfilePath } from "@/lib/profile-routing";
import { useChatLauncher } from "./shell/use-chat-launcher";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profiles/profile-page/profile-page";
import { apiProfileToProps } from "./authenticated-helpers/profile-settings-mapping";
import { PublicRouteLoadingState, PublicRouteMessageState } from "./public-route-states";

type PublicProfileResolution = {
  is_canonical: boolean;
  profile: ApiProfile;
  requested_handle_label: string;
  resolved_handle_label: string;
  created_communities: Array<{
    community_id: string;
    display_name: string;
    route_slug: string | null;
    created_at: string;
  }>;
};

const loggedUnavailableProfileActions = new Set<string>();

function usePublicProfile(handleLabel: string) {
  const api = useApi();
  const [resolution, setResolution] = React.useState<PublicProfileResolution | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.publicProfiles.getByHandle(handleLabel)
      .then((result) => {
        if (cancelled) return;
        setResolution(result);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, handleLabel]);

  return { error, loading, resolution };
}

function PublicProfileNotFound({ path, title, description }: { path: string; title: string; description: string }) {
  return (
    <PublicRouteMessageState
      description={description.replace("{path}", path)}
      title={title}
    />
  );
}

function PublicProfileErrorState({ description, title }: { description: string; title: string }) {
  return <PublicRouteMessageState description={description} title={title} />;
}

export function PublicProfileRoutePage({
  handleLabel,
  hostSuffix,
}: {
  handleLabel: string;
  hostSuffix?: string | null;
}) {
  const { locale } = useUiLocale();
  const chatLauncher = useChatLauncher();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes");
  const publicCopy = copy.publicProfile;
  const profileCopy = copy.profile;
  const session = useSession();
  const { error, loading, resolution } = usePublicProfile(handleLabel);
  const ownProfile = Boolean(session?.profile.user_id && resolution?.profile.user_id === session.profile.user_id);
  const followState = useProfileFollowState(resolution?.profile.primary_wallet_address ?? null, ownProfile);

  React.useEffect(() => {
    if (!resolution) {
      return;
    }

    const targetWalletAddress = resolution.profile.primary_wallet_address ?? null;
    const messageEnabled = !ownProfile && Boolean(targetWalletAddress);

    const followDisabled = followState.followDisabled || followState.followLoading;
    const disabledReason = !ownProfile && !targetWalletAddress
      ? "target_profile_missing_primary_wallet_address"
      : null;

    if (!followDisabled && messageEnabled) {
      return;
    }

    const logKey = [
      resolution.resolved_handle_label,
      disabledReason,
      followDisabled,
      followState.followLoading,
      messageEnabled,
    ].join(":");
    if (loggedUnavailableProfileActions.has(logKey)) {
      return;
    }
    loggedUnavailableProfileActions.add(logKey);

    logger.warn("[public-profile] Profile actions unavailable.", {
      disabledReason,
      followDisabled,
      followLoading: followState.followLoading,
      handleLabel: resolution.resolved_handle_label,
      messageEnabled,
      ownProfile,
      targetUserId: resolution.profile.user_id,
      targetWalletAddress,
      viewerUserId: session?.profile.user_id ?? null,
    });
  }, [
    followState.followDisabled,
    followState.followLoading,
    ownProfile,
    resolution,
    session?.profile.user_id,
  ]);

  React.useEffect(() => {
    if (!resolution || resolution.is_canonical || typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(window.location.href);
    if (hostSuffix && resolution.resolved_handle_label.toLowerCase().endsWith(".pirate")) {
      const nextHost = `${resolution.resolved_handle_label.replace(/\.pirate$/i, "")}.${hostSuffix}`;
      if (window.location.hostname.toLowerCase() === nextHost.toLowerCase()) {
        return;
      }
      nextUrl.hostname = nextHost;
    } else {
      nextUrl.pathname = buildPublicProfilePath(resolution.resolved_handle_label);
    }
    window.location.replace(nextUrl.toString());
  }, [hostSuffix, resolution]);

  if (loading) {
    return <PublicRouteLoadingState />;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return (
        <PublicProfileNotFound
          description={publicCopy.notFoundDescription}
          path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)}
          title={publicCopy.notFoundTitle}
        />
      );
    }

    return (
      <PublicProfileErrorState
        description={getErrorMessage(error, publicCopy.errorDescription)}
        title={publicCopy.errorTitle}
      />
    );
  }

  if (!resolution) {
    return (
      <PublicProfileNotFound
        description={publicCopy.notFoundDescription}
        path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)}
        title={publicCopy.notFoundTitle}
      />
    );
  }

  const messageTarget = !ownProfile ? resolution.profile.primary_wallet_address : null;

  return (
    <ProfilePageComposition
      {...apiProfileToProps(resolution.profile, ownProfile, {
        followersLabel: profileCopy.followersLabel,
        followingLabel: profileCopy.followingLabel,
        joinedStatLabel: copy.common.joinedStatLabel,
      }, followState, localeTag)}
      onMessageProfile={messageTarget
        ? () => chatLauncher.openTarget(messageTarget)
        : undefined}
    />
  );
}
