"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useKnownCommunities } from "@/lib/known-communities-store";
import type { CommunityPickerItem } from "@/components/compositions/post-composer/post-composer.types";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { MobilePageHeader } from "@/components/compositions/app-shell-chrome/mobile-page-header";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";

import { interpolateMessage, useRouteMessages } from "./route-core";
import { EmptyFeedState, StackPageShell } from "./route-shell";

export function NotFoundPage({ path }: { path: string }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.notFound.title}
      description={interpolateMessage(copy.notFound.description, { path })}
      actions={<Button onClick={() => navigate("/")} variant="secondary">{copy.common.backHome}</Button>}
    >
      <EmptyFeedState message={copy.notFound.body} />
    </StackPageShell>
  );
}

export function CreatePostGlobalPage({
  renderCreatePost,
}: {
  renderCreatePost: (communityId: string) => React.ReactNode;
}) {
  const { copy } = useRouteMessages();
  const isMobile = useIsMobile();
  const knownCommunities = useKnownCommunities();
  const [selectedCommunityId, setSelectedCommunityId] = React.useState<string | null>(null);
  const pickerItems: CommunityPickerItem[] = React.useMemo(
    () => knownCommunities.map((c) => ({
      communityId: c.communityId,
      displayName: c.displayName,
      avatarSrc: c.avatarSrc,
    })),
    [knownCommunities],
  );

  if (selectedCommunityId) {
    return <>{renderCreatePost(selectedCommunityId)}</>;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate("/")} title={copy.createPost.title} />
        <section className="flex min-w-0 flex-1 flex-col px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <PostComposer
            availableTabs={["text", "image", "link", "song"]}
            canCreateSongPost
            clubName={copy.common.chooseCommunity}
            communityPickerEmptyLabel={copy.common.noRecentCommunities}
            communityPickerItems={pickerItems}
            mode="text"
            onSelectCommunity={setSelectedCommunityId}
            submitDisabled
            submitLabel={copy.createPost.actions.post}
          />
        </section>
      </div>
    );
  }

  return (
    <PostComposer
      availableTabs={["text", "image", "link", "song"]}
      canCreateSongPost
      clubName={copy.common.chooseCommunity}
      communityPickerEmptyLabel={copy.common.noRecentCommunities}
      communityPickerItems={pickerItems}
      mode="text"
      onSelectCommunity={setSelectedCommunityId}
      submitDisabled
      submitLabel={copy.createPost.actions.post}
    />
  );
}
