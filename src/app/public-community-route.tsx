"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview, LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { sortCommunityFeedPosts } from "@/app/authenticated-routes/feed-sorting";
import { type FeedSort, type FeedSortOption } from "@/components/compositions/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { buildCommunitySidebarRequirements } from "./authenticated-routes/community-sidebar-helpers";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function buildFeedSortOptions(copy: ReturnType<typeof getLocaleMessages<"routes">>["common"]): FeedSortOption[] {
  return [
    { value: "best", label: copy.bestTab },
    { value: "new", label: copy.newTab },
    { value: "top", label: copy.topTab },
  ];
}

function usePublicCommunityPageData(communityId: string, localeTag: string, activeSort: FeedSort) {
  const api = useApi();
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [rawPosts, setRawPosts] = React.useState<ApiPost[]>([]);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.publicCommunities.get(communityId, { locale: localeTag }),
      api.publicCommunities.listPosts(communityId, { limit: "100", locale: localeTag, sort: "new" }),
    ])
      .then(([previewResult, postResponse]) => {
        if (cancelled) return;
        setPreview(previewResult);
        setRawPosts(postResponse.items);
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
  }, [api, communityId, localeTag]);

  const posts = React.useMemo(() => sortCommunityFeedPosts(rawPosts, activeSort), [activeSort, rawPosts]);

  return { error, loading, posts, preview };
}

function buildPreviewSidebar(preview: ApiCommunityPreview) {
  return {
    avatarSrc: preview.avatar_ref ?? undefined,
    createdAt: preview.created_at,
    description: resolveCommunityLocalizedText(preview, "community.description", preview.description),
    displayName: preview.display_name,
    memberCount: preview.member_count ?? undefined,
    membershipMode: preview.membership_mode,
    requirements: buildCommunitySidebarRequirements({
      gateSummaries: preview.membership_gate_summaries,
    }),
    rules: [],
  };
}

function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.notFoundTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          {copy.notFoundDescription.replace("{communityId}", communityId)}
        </p>
      </div>
    </div>
  );
}

function PublicCommunityErrorState({ description }: { description: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.errorTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function PublicCommunityRoutePage({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
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
        description={getErrorMessage(error, copy.publicCommunity.errorDescription)}
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
        availableSorts={sortOptions}
        bannerSrc={preview.banner_ref ?? undefined}
        communityId={preview.community_id}
        emptyState={{
          title: copy.publicCommunity.emptyPosts,
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
