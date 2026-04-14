"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { cn } from "@/lib/utils";
import type { ProfilePageProps } from "./profile-page.types";
import { CommentsPanel, OverviewPanel, PostsPanel, ScrobblesPanel } from "./profile-activity-panels";
import { ProfileHero } from "./profile-hero";
import { ProfileRightRail } from "./profile-right-rail";

export function ProfilePage({
  className,
  comments = [],
  defaultTab = "overview",
  overviewItems = [],
  posts = [],
  profile,
  rightRail,
  scrobbles = [],
}: ProfilePageProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="flex w-full flex-col gap-6 pb-10">
        <ProfileHero profile={profile} />

        <Tabs className="flex flex-col gap-6" defaultValue={defaultTab}>
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-[var(--radius-3xl)] bg-muted/80 p-1.5">
            <TabsTrigger className="min-w-fit" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="min-w-fit" value="posts">Posts</TabsTrigger>
            <TabsTrigger className="min-w-fit" value="comments">Comments</TabsTrigger>
            <TabsTrigger className="min-w-fit" value="scrobbles">Scrobbles</TabsTrigger>
          </TabsList>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0">
              <TabsContent className="mt-0" value="overview">
                <OverviewPanel items={overviewItems} />
              </TabsContent>
              <TabsContent className="mt-0" value="posts">
                <PostsPanel posts={posts} />
              </TabsContent>
              <TabsContent className="mt-0" value="comments">
                <CommentsPanel comments={comments} />
              </TabsContent>
              <TabsContent className="mt-0" value="scrobbles">
                <ScrobblesPanel scrobbles={scrobbles} />
              </TabsContent>
            </div>

            <ProfileRightRail
              className="xl:sticky xl:top-6 xl:self-start"
              profile={profile}
              rightRail={rightRail}
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
}
