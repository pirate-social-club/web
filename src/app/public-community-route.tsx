"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview, LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { COMMUNITY_SORT_OPTIONS, toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { type FeedSort } from "@/components/compositions/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { useUiLocale } from "@/lib/ui-locale";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function usePublicCommunityPageData(communityId: string, localeTag: string, activeSort: FeedSort) {
  const api = useApi();
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [posts, setPosts] = React.useState<ApiPost[]>([]);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.publicCommunities.get(communityId),
      api.publicCommunities.listPosts(communityId, { locale: localeTag, sort: activeSort }),
    ])
      .then(([previewResult, postResponse]) => {
        if (cancelled) return;
        setPreview(previewResult);
        setPosts(postResponse.items);
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
  }, [activeSort, api, communityId, localeTag]);

  return { error, loading, posts, preview };
}

function buildPreviewSidebar(preview: ApiCommunityPreview) {
  return {
    avatarSrc: preview.avatar_ref ?? undefined,
    createdAt: preview.created_at,
    description: preview.description ?? "",
    displayName: preview.display_name,
    memberCount: preview.member_count ?? undefined,
    membershipMode: preview.membership_mode,
    rules: [],
  };
}

function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Community not found</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          We could not find <span className="text-foreground">c/{communityId}</span>.
        </p>
      </div>
    </div>
  );
}

function PublicCommunityErrorState({ description }: { description: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Community</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function PublicCommunityRoutePage({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: locale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [locale]);
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const { error, loading, posts, preview } = usePublicCommunityPageData(communityId, contentLocale, activeSort);

  if (loading) {
    return null;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityNotFound communityId={communityId} />;
    }

    return (
      <PublicCommunityErrorState
        description={getErrorMessage(error, "This community could not be loaded right now.")}
      />
    );
  }

  if (!preview) {
    return <PublicCommunityNotFound communityId={communityId} />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={preview.avatar_ref ?? undefined}
        availableSorts={COMMUNITY_SORT_OPTIONS}
        bannerSrc={preview.banner_ref ?? undefined}
        communityId={preview.community_id}
        emptyState={{
          title: "No posts yet",
        }}
        items={posts.map((post) => toCommunityFeedItem(post, {}))}
        onSortChange={setActiveSort}
        routeLabel={`c/${communityId}`}
        sidebar={buildPreviewSidebar(preview)}
        title={preview.display_name}
      />
    </section>
  );
}
