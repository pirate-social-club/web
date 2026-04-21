"use client";

import * as React from "react";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { PublicProfilePage } from "@/components/compositions/public-profile-page/public-profile-page";
import type { PublicProfileProps } from "@/components/compositions/public-profile-page/public-profile-page.types";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { buildCommunityPath } from "@/lib/community-routing";
import { getErrorMessage } from "@/lib/error-utils";
import { useUiLocale, resolveLocaleLanguageTag } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { buildPublicProfilePath, getProfileHandleLabel } from "@/lib/profile-routing";
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

function apiProfileToPublicProfileProps(
  resolution: PublicProfileResolution,
  appOrigin: string,
  labels: { joinedLabel: string },
  localeTag: string,
): PublicProfileProps {
  const profile = resolution.profile;
  const publicHandle = getProfileHandleLabel(profile);
  const canonicalHandle = profile.global_handle.label;

  return {
    avatarSrc: profile.avatar_ref ?? undefined,
    bannerSrc: profile.cover_ref ?? undefined,
    bio: profile.bio ?? undefined,
    communities: resolution.created_communities.map((community) => ({
      label: community.display_name,
      href: `${appOrigin}${buildCommunityPath(community.community_id, community.route_slug)}`,
    })),
    displayName: profile.display_name ?? publicHandle,
    defaultTab: "about",
    handle: publicHandle,
    meta: [
      {
        label: labels.joinedLabel,
        value: new Date(profile.created_at).toLocaleDateString(localeTag, {
          month: "short",
          year: "numeric",
        }),
      },
    ],
    openInPirateHref: `${appOrigin}${buildPublicProfilePath(canonicalHandle)}`,
    posts: [],
    scrobbles: [],
    songs: [],
    tagline: publicHandle === canonicalHandle ? undefined : canonicalHandle,
    videos: [],
  };
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
  appOrigin,
  handleLabel,
  hostSuffix,
}: {
  appOrigin: string;
  handleLabel: string;
  hostSuffix?: string | null;
}) {
  const { locale } = useUiLocale();
  const localeTag = resolveLocaleLanguageTag(locale);
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const { error, loading, resolution } = usePublicProfile(handleLabel);

  React.useEffect(() => {
    if (!resolution || !hostSuffix || resolution.is_canonical || typeof window === "undefined") {
      return;
    }

    const nextHost = `${resolution.resolved_handle_label.replace(/\.pirate$/i, "")}.${hostSuffix}`;
    if (window.location.hostname.toLowerCase() === nextHost.toLowerCase()) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.hostname = nextHost;
    window.location.replace(nextUrl.toString());
  }, [hostSuffix, resolution]);

  if (loading) {
    return <PublicRouteLoadingState />;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return (
        <PublicProfileNotFound
          description={copy.notFoundDescription}
          path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)}
          title={copy.notFoundTitle}
        />
      );
    }

    return (
      <PublicProfileErrorState
        description={getErrorMessage(error, copy.errorDescription)}
        title={copy.errorTitle}
      />
    );
  }

  if (!resolution) {
    return (
      <PublicProfileNotFound
        description={copy.notFoundDescription}
        path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)}
        title={copy.notFoundTitle}
      />
    );
  }

  return <PublicProfilePage {...apiProfileToPublicProfileProps(resolution, appOrigin, { joinedLabel: copy.joinedLabel }, localeTag)} />;
}
