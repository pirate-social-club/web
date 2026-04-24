"use client";

import { Article, ChatCircle, MusicNotes, SquaresFour, Wallet } from "@phosphor-icons/react";

import { useIsMobile } from "@/hooks/use-mobile";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/flat-tabs/flat-tabs";
import { Tabs, TabsContent } from "@/components/primitives/tabs";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { ProfilePageProps } from "./profile-page.types";
import { CommentsPanel, OverviewPanel, PostsPanel, ScrobblesPanel, WalletPanel } from "./profile-activity-panels";
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
  const hasWalletTab = Boolean(rightRail.walletAddress || rightRail.walletAssets?.length || rightRail.walletChainSections?.length);
  const tabColumns = isMobile ? (hasWalletTab ? 5 : 4) : undefined;
  const mobileTabIconClassName = "size-5";

  return (
    <div className={cn("w-full min-h-screen bg-background text-foreground", className)}>
      <ContentRailShell
        className={cn("pb-10", isMobile && "pb-6")}
        header={(
          <ProfileHero
            localeTag={localeTag}
            onEditProfile={onEditProfile}
            profile={profile}
            stats={rightRail.stats}
          />
        )}
        rail={isMobile ? null : <ProfileRightRail className="xl:sticky xl:top-6" rightRail={rightRail} />}
      >
        <Tabs className={cn("flex flex-col gap-6", isMobile && "gap-4")} defaultValue={defaultTab}>
          <FlatTabsList columns={tabColumns} isRtl={isRtl}>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.overviewTab} value="overview">
              {isMobile ? (
                <>
                  <SquaresFour aria-hidden="true" className={mobileTabIconClassName} />
                  <span className="sr-only">{copy.overviewTab}</span>
                </>
              ) : copy.overviewTab}
            </FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.postsTab} value="posts">
              {isMobile ? (
                <>
                  <Article aria-hidden="true" className={mobileTabIconClassName} />
                  <span className="sr-only">{copy.postsTab}</span>
                </>
              ) : copy.postsTab}
            </FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.commentsTab} value="comments">
              {isMobile ? (
                <>
                  <ChatCircle aria-hidden="true" className={mobileTabIconClassName} />
                  <span className="sr-only">{copy.commentsTab}</span>
                </>
              ) : copy.commentsTab}
            </FlatTabsTrigger>
            <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.scrobblesTab} value="scrobbles">
              {isMobile ? (
                <>
                  <MusicNotes aria-hidden="true" className={mobileTabIconClassName} />
                  <span className="sr-only">{copy.scrobblesTab}</span>
                </>
              ) : copy.scrobblesTab}
            </FlatTabsTrigger>
            {hasWalletTab ? (
              <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.walletTitle} value="wallet">
                {isMobile ? (
                  <>
                    <Wallet aria-hidden="true" className={mobileTabIconClassName} />
                    <span className="sr-only">{copy.walletTitle}</span>
                  </>
                ) : copy.walletTitle}
              </FlatTabsTrigger>
            ) : null}
          </FlatTabsList>

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
          {hasWalletTab ? (
            <TabsContent className="mt-0" value="wallet">
              <WalletPanel
                walletAddress={rightRail.walletAddress}
                walletAssets={rightRail.walletAssets}
                walletChainSections={rightRail.walletChainSections}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </ContentRailShell>
    </div>
  );
}
