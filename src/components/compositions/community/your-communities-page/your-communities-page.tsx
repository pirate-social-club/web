"use client";

import * as React from "react";

import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/system/flat-tabs/flat-tabs";
import { CommunityAvatar } from "@/components/primitives/community-avatar";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Tabs, TabsContent } from "@/components/primitives/tabs";
import { Type } from "@/components/primitives/type";
import { formatCommunityRouteLabel } from "@/lib/community-routing";
import type { SidebarCommunitySummary } from "@/lib/owned-communities";

type YourCommunitiesTab = "following" | "joined";

function YourCommunityListItem({
  community,
  onSelectCommunity,
}: {
  community: SidebarCommunitySummary;
  onSelectCommunity: (community: SidebarCommunitySummary) => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 border-b border-border-soft px-1 py-4 text-start transition-colors last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:px-0 md:hover:bg-transparent"
      onClick={() => onSelectCommunity(community)}
      type="button"
    >
      <CommunityAvatar
        className="size-11 border-border-soft"
        avatarSrc={community.avatarSrc}
        communityId={community.communityId}
        displayName={community.displayName}
      />
      <div className="min-w-0 flex-1">
        <Type as="div" variant="body-strong" className="truncate">{community.displayName}</Type>
        <Type as="div" variant="caption" className="truncate">
          {formatCommunityRouteLabel(community.communityId, community.routeSlug)}
        </Type>
      </div>
    </button>
  );
}

function YourCommunitySection({
  communities,
  emptyLabel,
  onSelectCommunity,
  title,
}: {
  communities: SidebarCommunitySummary[];
  emptyLabel: string;
  onSelectCommunity: (community: SidebarCommunitySummary) => void;
  title: string;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-4">
        <Type as="h2" variant="h3" className="hidden md:block">
          {title}
        </Type>
      </div>
      {communities.length === 0 ? (
        <Type as="p" variant="caption" className="py-4">
          {emptyLabel}
        </Type>
      ) : (
        <div>
          {communities.map((community) => (
            <YourCommunityListItem
              community={community}
              key={community.communityId}
              onSelectCommunity={onSelectCommunity}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function YourCommunitiesPageView({
  createCommunityLabel,
  emptyFollowingLabel,
  emptyJoinedLabel,
  followingCommunities,
  followingLabel,
  joinedCommunities,
  joinedLabel,
  onCreateCommunity,
  onSelectCommunity,
  title,
}: {
  createCommunityLabel: string;
  emptyFollowingLabel: string;
  emptyJoinedLabel: string;
  followingCommunities: SidebarCommunitySummary[];
  followingLabel: string;
  joinedCommunities: SidebarCommunitySummary[];
  joinedLabel: string;
  onCreateCommunity: () => void;
  onSelectCommunity: (community: SidebarCommunitySummary) => void;
  title: string;
}) {
  const [activeTab, setActiveTab] = React.useState<YourCommunitiesTab>("following");

  return (
    <PageContainer className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="hidden flex-col gap-4 md:flex md:flex-row md:items-center md:justify-between">
        <Type as="h1" variant="h1">
          {title}
        </Type>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button onClick={onCreateCommunity} variant="secondary">
            {createCommunityLabel}
          </Button>
        </div>
      </div>

      <div className="md:hidden">
        <Tabs className="flex flex-col gap-4" onValueChange={(value) => setActiveTab(value as YourCommunitiesTab)} value={activeTab}>
          <FlatTabsList columns={2}>
            <FlatTabsTrigger title={followingLabel} value="following">
              {followingLabel}
            </FlatTabsTrigger>
            <FlatTabsTrigger title={joinedLabel} value="joined">
              {joinedLabel}
            </FlatTabsTrigger>
          </FlatTabsList>
          <TabsContent className="mt-0" value="following">
            <YourCommunitySection
              communities={followingCommunities}
              emptyLabel={emptyFollowingLabel}
              onSelectCommunity={onSelectCommunity}
              title={followingLabel}
            />
          </TabsContent>
          <TabsContent className="mt-0" value="joined">
            <YourCommunitySection
              communities={joinedCommunities}
              emptyLabel={emptyJoinedLabel}
              onSelectCommunity={onSelectCommunity}
              title={joinedLabel}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden min-w-0 flex-col gap-8 md:flex">
        <YourCommunitySection
          communities={followingCommunities}
          emptyLabel={emptyFollowingLabel}
          onSelectCommunity={onSelectCommunity}
          title={followingLabel}
        />
        <div className="h-px bg-border-soft" />
        <YourCommunitySection
          communities={joinedCommunities}
          emptyLabel={emptyJoinedLabel}
          onSelectCommunity={onSelectCommunity}
          title={joinedLabel}
        />
      </div>
    </PageContainer>
  );
}
