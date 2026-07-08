"use client";

import * as React from "react";
import { Article, CalendarCheck, ChatCircle, SquaresFour, Wallet } from "@phosphor-icons/react";

import { useIsMobile } from "@/hooks/use-mobile";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/system/flat-tabs/flat-tabs";
import { Tabs, TabsContent } from "@/components/primitives/tabs";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { ProfileActivityItem, ProfileCommentItem, ProfilePageProps, ProfilePageTab, ProfilePostItem } from "./profile-page.types";
import { CommentsPanel, OverviewPanel, PostsPanel, WalletPanel } from "./profile-activity-panels";
import { ProfileHero } from "./profile-hero";
import { ProfileRightRail } from "./profile-right-rail";

const VALID_TABS: ProfilePageTab[] = ["overview", "posts", "comments", "wallet", "book"];
const EMPTY_PROFILE_COMMENTS: ProfileCommentItem[] = [];
const EMPTY_PROFILE_OVERVIEW_ITEMS: ProfileActivityItem[] = [];
const EMPTY_PROFILE_POSTS: ProfilePostItem[] = [];

function useHashTab(defaultTab: ProfilePageTab): [ProfilePageTab, (tab: ProfilePageTab) => void] {
  const readHashTab = React.useCallback((): ProfilePageTab => {
    if (typeof window === "undefined") return defaultTab;
    const hash = window.location.hash.replace(/^#/, "");
    return VALID_TABS.includes(hash as ProfilePageTab) ? (hash as ProfilePageTab) : defaultTab;
  }, [defaultTab]);
  const [tab, setTab] = React.useState<ProfilePageTab>(() => {
    return readHashTab();
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      setTab(readHashTab());
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [readHashTab]);

  const setHashTab = React.useCallback((nextTab: ProfilePageTab) => {
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.hash = nextTab;
    window.history.replaceState({}, "", url.toString());
  }, []);

  return [tab, setHashTab];
}

export function ProfilePage({
  activityError,
  className,
  comments = EMPTY_PROFILE_COMMENTS,
  defaultTab = "overview",
  onActivityTabChange,
  onEditProfile,
  onMessageProfile,
  onBookingCta,
  bookPanel,
  overviewItems = EMPTY_PROFILE_OVERVIEW_ITEMS,
  posts = EMPTY_PROFILE_POSTS,
  profile,
  rightRail,
}: ProfilePageProps) {
  const { isRtl, locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").profile;
  const localeTag = resolveLocaleLanguageTag(locale);
  const hasWalletTab = Boolean(rightRail.walletAddress || rightRail.walletAssets?.length || rightRail.walletChainSections?.length);
  const hasBookTab = Boolean(bookPanel);
  const tabColumns = isMobile ? 3 + (hasWalletTab ? 1 : 0) + (hasBookTab ? 1 : 0) : undefined;
  const mobileTabIconClassName = "size-5";
  const [activeTab, setActiveTab] = useHashTab(defaultTab);

  React.useEffect(() => {
    if (activeTab === "overview" || activeTab === "posts" || activeTab === "comments") {
      onActivityTabChange?.(activeTab);
    }
  }, [activeTab, onActivityTabChange]);

  return (
    <div className={cn("w-full bg-background text-foreground", className)}>
      <ContentRailShell
        className={cn("pb-10", isMobile && "pb-6")}
        header={(
          <ProfileHero
            localeTag={localeTag}
            onEditProfile={onEditProfile}
            onMessageProfile={onMessageProfile}
            onBookingCta={onBookingCta}
            profile={profile}
            stats={rightRail.stats}
          />
        )}
        rail={isMobile ? null : <ProfileRightRail className="xl:sticky xl:top-6" rightRail={rightRail} />}
      >
        <Tabs
          className={cn("flex flex-col gap-6", isMobile && "gap-4")}
          onValueChange={(value) => setActiveTab(value as ProfilePageTab)}
          value={activeTab}
        >
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
            {hasBookTab ? (
              <FlatTabsTrigger className={!isMobile ? "min-w-fit px-5" : "px-0"} title={copy.bookTab} value="book">
                {isMobile ? (
                  <>
                    <CalendarCheck aria-hidden="true" className={mobileTabIconClassName} />
                    <span className="sr-only">{copy.bookTab}</span>
                  </>
                ) : copy.bookTab}
              </FlatTabsTrigger>
            ) : null}
          </FlatTabsList>

          <TabsContent className="mt-0" value="overview">
            <OverviewPanel error={activityError} items={overviewItems} />
          </TabsContent>
          <TabsContent className="mt-0" value="posts">
            <PostsPanel error={activityError} posts={posts} />
          </TabsContent>
          <TabsContent className="mt-0" value="comments">
            <CommentsPanel comments={comments} error={activityError} />
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
          {hasBookTab ? (
            <TabsContent className="mt-0" value="book">
              {bookPanel}
            </TabsContent>
          ) : null}
        </Tabs>
      </ContentRailShell>
    </div>
  );
}
