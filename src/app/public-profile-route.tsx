"use client";

import * as React from "react";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { PublicProfilePage } from "@/components/compositions/public-profile-page/public-profile-page";
import type { PublicProfileProps } from "@/components/compositions/public-profile-page/public-profile-page.types";
import { Spinner } from "@/components/primitives/spinner";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { buildCommunityPath } from "@/lib/community-routing";
import { buildPublicProfilePath, getProfileHandleLabel } from "@/lib/profile-routing";

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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

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
        label: "Joined",
        value: new Date(profile.created_at).toLocaleDateString("en-US", {
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

function PublicProfileNotFound({ path }: { path: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile not found</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          We could not find a public profile for <span className="text-foreground">{path}</span>.
        </p>
      </div>
    </div>
  );
}

function PublicProfileErrorState({ description }: { description: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Public profile</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicProfileNotFound path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)} />;
    }

    return (
      <PublicProfileErrorState
        description={getErrorMessage(error, "This public profile could not be loaded right now.")}
      />
    );
  }

  if (!resolution) {
    return <PublicProfileNotFound path={hostSuffix ? `https://${handleLabel}.${hostSuffix}` : buildPublicProfilePath(handleLabel)} />;
  }

  return <PublicProfilePage {...apiProfileToPublicProfileProps(resolution, appOrigin)} />;
}
