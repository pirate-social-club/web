"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { ProfilePageProps } from "./profile-page.types";
import { CommentsPanel, OverviewPanel, PostsPanel, ScrobblesPanel } from "./profile-activity-panels";
import { ProfileHero } from "./profile-hero";
import { ProfileRightRail } from "./profile-right-rail";

export function ProfilePage({
  className,
  comments = [],
  defaultTab = "overview",
  onEditProfile,
  overviewItems = [],
  posts = [],
  profile,
  rightRail,
  scrobbles = [],
}: ProfilePageProps) {
  const { isRtl, locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").profile;

  return (
    <div className={cn("w-full min-h-screen bg-background text-foreground", className)}>
      <div className={cn("flex w-full flex-col gap-6 pb-10", isMobile && "gap-4 pb-6")}>
        <ProfileHero onEditProfile={onEditProfile} profile={profile} />

        <Tabs className={cn("flex flex-col gap-6", isMobile && "gap-4")} defaultValue={defaultTab}>
          <TabsList
            className={cn(
              "h-auto w-full gap-2 overflow-x-auto rounded-[var(--radius-3xl)] bg-muted/80 p-1.5",
              isMobile && "rounded-none border-b border-border-soft bg-transparent p-0",
              isRtl ? "justify-end" : "justify-start",
            )}
          >
            <TabsTrigger className={cn("min-w-fit", isMobile && "rounded-none border-b-2 border-transparent px-0 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none")} value="overview">{copy.overviewTab}</TabsTrigger>
            <TabsTrigger className={cn("min-w-fit", isMobile && "rounded-none border-b-2 border-transparent px-0 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none")} value="posts">{copy.postsTab}</TabsTrigger>
            <TabsTrigger className={cn("min-w-fit", isMobile && "rounded-none border-b-2 border-transparent px-0 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none")} value="comments">{copy.commentsTab}</TabsTrigger>
            <TabsTrigger className={cn("min-w-fit", isMobile && "rounded-none border-b-2 border-transparent px-0 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none")} value="scrobbles">{copy.scrobblesTab}</TabsTrigger>
          </TabsList>

          <div className={cn("flex flex-col gap-6 xl:items-start", isRtl ? "xl:flex-row-reverse" : "xl:flex-row")}>
            <div className="min-w-0 xl:flex-1">
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
              className="xl:w-[21rem] xl:shrink-0 xl:sticky xl:top-6 xl:self-start"
              profile={profile}
              rightRail={rightRail}
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
}
