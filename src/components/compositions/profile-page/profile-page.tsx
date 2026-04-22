"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/flat-tabs/flat-tabs";
import { Tabs, TabsContent } from "@/components/primitives/tabs";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale";
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
  const localeTag = resolveLocaleLanguageTag(locale);

  return (
    <div className={cn("w-full min-h-screen bg-background text-foreground", className)}>
      <div className={cn("flex w-full flex-col gap-6 pb-10", isMobile && "gap-4 pb-6")}>
        <ProfileHero
          localeTag={localeTag}
          onEditProfile={onEditProfile}
          profile={profile}
          stats={rightRail.stats}
        />

        <Tabs className={cn("flex flex-col gap-6", isMobile && "gap-4")} defaultValue={defaultTab}>
          <FlatTabsList columns={isMobile ? 4 : undefined} isRtl={isRtl}>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : undefined} value="overview">{copy.overviewTab}</FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : undefined} value="posts">{copy.postsTab}</FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : undefined} value="comments">{copy.commentsTab}</FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : undefined} value="scrobbles">{copy.scrobblesTab}</FlatTabsTrigger>
          </FlatTabsList>

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
              className="hidden md:flex xl:w-[21rem] xl:shrink-0 xl:sticky xl:top-6 xl:self-start"
              profile={profile}
              rightRail={rightRail}
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
}
