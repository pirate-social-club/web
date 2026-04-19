"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useKnownCommunities } from "@/lib/known-communities-store";
import type { CommunityPickerItem } from "@/components/compositions/post-composer/post-composer.types";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { Button } from "@/components/primitives/button";

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

  return (
    <PostComposer
      clubName="Choose a community"
      communityPickerEmptyLabel="No recent communities."
      communityPickerItems={pickerItems}
      mode="text"
      onSelectCommunity={setSelectedCommunityId}
      submitDisabled
    />
  );
}
