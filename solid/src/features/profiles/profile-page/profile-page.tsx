/** @jsxImportSource @solidjs/web */

import type { JSX } from "@solidjs/web";
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";

import {
  Button,
  Card,
  IconChatCircle,
  IconFileText,
  IconList,
  IconWallet,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Type,
  cn,
  createIsMobile,
} from "../../../design-system";
import { CommentCard } from "../../posts/post-thread/comment-card";
import { PostCard } from "../../posts/post-card/post-card";
import { PostCardSkeleton } from "../../posts/post-card/skeleton";
import { ContentRailShell } from "../../shell/content-rail-shell";
import { StandardRoutePage } from "../../shell/page-shell";
import { IdentityHero } from "../identity-hero/identity-hero";
import { WalletHub } from "../../wallet/wallet-hub";
import {
  hasProfileWallet,
  profileWalletChainSections,
  resolveProfileTab,
} from "./profile-page.model";
import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfileData,
  ProfilePageProps,
  ProfilePageRightRail,
  ProfilePageTab,
  ProfilePostItem,
  ProfileSidebarStat,
} from "./profile-page.types";

const emptyActivities: ProfileActivityItem[] = [];
const emptyPosts: ProfilePostItem[] = [];
const emptyComments: ProfileCommentItem[] = [];

function formatStat(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

function ProfileActions(props: {
  onBookingCta?: () => void;
  onCommunitiesCta?: () => void;
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  profile: ProfileData;
}) {
  return (
    <Show
      when={props.profile.viewerContext === "self"}
      fallback={(
        <>
          <Button
            disabled={props.profile.followDisabled}
            loading={props.profile.followBusy || props.profile.followLoading}
            onClick={props.profile.onToggleFollow}
            variant={props.profile.viewerFollows ? "secondary" : "default"}
          >
            {props.profile.followUnavailable ? "Follow unavailable" : props.profile.viewerFollows ? "Following" : "Follow"}
          </Button>
          <Button disabled={!props.profile.canMessage || !props.onMessageProfile} onClick={props.onMessageProfile} variant="secondary">Message</Button>
        </>
      )}
    >
      <div class="flex flex-wrap gap-2">
        <Button disabled={!props.onEditProfile} onClick={props.onEditProfile}>Edit profile</Button>
        <Show when={props.profile.bookingCtaLabel && props.onBookingCta}>
          <Button onClick={props.onBookingCta} variant="secondary">{props.profile.bookingCtaLabel}</Button>
        </Show>
        <Show when={props.onCommunitiesCta}>
          <Button onClick={props.onCommunitiesCta} variant="secondary">Your Communities</Button>
        </Show>
      </div>
    </Show>
  );
}

function ProfileHero(props: {
  onBookingCta?: () => void;
  onCommunitiesCta?: () => void;
  onEditProfile?: () => void;
  onMessageProfile?: () => void;
  profile: ProfileData;
  stats: ProfileSidebarStat[];
}) {
  const isMobile = createIsMobile();
  const details = () => (
    <div class="space-y-3">
      <Show when={props.profile.bio}>
        <Type as="p" class="max-w-3xl text-muted-foreground" variant="body">{props.profile.bio}</Type>
      </Show>
      <Show when={props.profile.meta?.length}>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <For each={props.profile.meta}>
            {(item) => <Type as="div" class="flex items-center gap-2 text-muted-foreground" variant="caption"><Type as="span" variant="body-strong">{item.value}</Type>{item.label}</Type>}
          </For>
        </div>
      </Show>
      <Show when={isMobile() && props.stats.length > 0}>
        <dl class="grid grid-cols-3 gap-x-4 gap-y-3 pt-1">
          <For each={props.stats}>
            {(stat) => <div class="min-w-0"><dt><Type as="span" variant="caption">{stat.label}</Type></dt><Type as="dd" class="truncate" variant="h4">{formatStat(stat.value)}</Type></div>}
          </For>
        </dl>
      </Show>
    </div>
  );

  return (
    <IdentityHero
      actions={<ProfileActions onBookingCta={props.onBookingCta} onCommunitiesCta={props.onCommunitiesCta} onEditProfile={props.onEditProfile} onMessageProfile={props.onMessageProfile} profile={props.profile} />}
      avatarBadgeCountryCode={props.profile.nationalityBadgeCountryCode}
      avatarBadgeLabel={props.profile.nationalityBadgeLabel}
      avatarFallback={props.profile.displayName}
      avatarFallbackSeed={props.profile.avatarSeed}
      avatarSrc={props.profile.avatarSrc}
      coverClass="bg-background md:h-60"
      coverOverlay={<div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />}
      coverSrc={props.profile.bannerSrc}
      details={details()}
      subtitle={isMobile() ? undefined : props.profile.tagline ?? props.profile.handle}
      title={props.profile.displayName}
    />
  );
}

function EmptyState(props: { label: string }) {
  const isMobile = createIsMobile();
  return (
    <Card class={cn("px-5 py-8 shadow-none", isMobile() && "border-0 bg-transparent px-0")}>
      <Type variant="caption">{props.label}</Type>
    </Card>
  );
}

function FeedStack(props: { children: JSX.Element; state?: "loading" | "ready" }) {
  const isMobile = createIsMobile();
  return <div class={cn("space-y-3", isMobile() && "overflow-hidden border-y border-border-soft space-y-0")} data-profile-activity-state={props.state}>{props.children}</div>;
}

function MobileFlatCard(props: { children: JSX.Element; isLast: boolean }) {
  return (
    <Card class={cn(
      "overflow-hidden rounded-none border-x-0 border-t-0 bg-transparent shadow-none md:rounded-[var(--radius-lg)] md:border md:bg-card md:shadow-md",
      props.isLast && "border-b-0 md:border",
    )}>
      {props.children}
    </Card>
  );
}

function LoadingState() {
  return (
    <FeedStack state="loading">
      <PostCardSkeleton showMedia />
      <PostCardSkeleton showMedia={false} />
      <PostCardSkeleton showMedia={false} />
    </FeedStack>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && Boolean(target.closest("a,button,input,textarea,select,[role=button],[role=link]"));
}

function navigateTo(href: string) {
  if (typeof window !== "undefined") window.location.assign(href);
}

function CommentActivity(props: { comment: ProfileCommentItem; isLast: boolean }) {
  const clickable = () => Boolean(props.comment.postHref);
  return (
    <article
      class={cn("border-b border-border-soft px-5 py-4", props.isLast && "border-b-0", clickable() && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20")}
      onClick={(event) => {
        if (clickable() && props.comment.postHref && !isInteractiveTarget(event.target)) navigateTo(props.comment.postHref);
      }}
      onKeyDown={(event) => {
        if (!clickable() || !props.comment.postHref || isInteractiveTarget(event.target) || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        navigateTo(props.comment.postHref);
      }}
      role={clickable() ? "link" : undefined}
      tabindex={clickable() ? 0 : undefined}
    >
      <CommentCard
        authorAvatarSeed={props.comment.authorAvatarSeed}
        authorAvatarSrc={props.comment.authorAvatarSrc}
        authorHref={props.comment.authorHref}
        authorLabel={props.comment.authorLabel}
        body={props.comment.body}
        bodyDir={props.comment.bodyDir}
        bodyLang={props.comment.bodyLang}
        metadataLabel={props.comment.communityLabel}
        onVote={props.comment.onVote}
        scoreLabel={props.comment.scoreLabel}
        timestampLabel={props.comment.timestampLabel}
        viewerVote={props.comment.viewerVote}
      />
      <Show when={props.comment.communityHref}>
        <a class="mt-2 inline-block" href={props.comment.communityHref} onClick={(event) => event.stopPropagation()}>
          <Type as="span" variant="caption">{props.comment.communityLabel}</Type>
        </a>
      </Show>
      <Show when={props.comment.postTitle}>
        <div class="mt-3">
          <Show
            when={props.comment.postHref}
            fallback={<Type variant="body-strong">{props.comment.postTitle}</Type>}
          >
            <a href={props.comment.postHref!}><Type as="span" variant="body-strong">{props.comment.postTitle}</Type></a>
          </Show>
        </div>
      </Show>
    </article>
  );
}

function ActivityItems(props: { items: ProfileActivityItem[] }) {
  return (
    <FeedStack state="ready">
      <For each={props.items}>
        {(item, index) => (
          <Show when={item.kind === "post"} fallback={<CommentActivity comment={(item as Extract<ProfileActivityItem, { kind: "comment" }>).comment} isLast={index() === props.items.length - 1} />}>
            <MobileFlatCard isLast={index() === props.items.length - 1}>
              <PostCard class="border-b-0" {...(item as Extract<ProfileActivityItem, { kind: "post" }>).post.post} />
            </MobileFlatCard>
          </Show>
        )}
      </For>
    </FeedStack>
  );
}

function ActivityPanel(props: { error?: string | null; items: ProfileActivityItem[]; loading?: boolean }) {
  return (
    <Show when={!props.error} fallback={<EmptyState label={props.error ?? "Unable to load activity."} />}>
      <Show when={!props.loading} fallback={<LoadingState />}>
        <Show when={props.items.length > 0} fallback={<EmptyState label="No activity yet." />}>
          <ActivityItems items={props.items} />
        </Show>
      </Show>
    </Show>
  );
}

function PostsPanel(props: { error?: string | null; loading?: boolean; posts: ProfilePostItem[] }) {
  return (
    <Show when={!props.error} fallback={<EmptyState label={props.error ?? "Unable to load posts."} />}>
      <Show when={!props.loading} fallback={<LoadingState />}>
        <Show when={props.posts.length > 0} fallback={<EmptyState label="No posts yet." />}>
          <ActivityItems items={props.posts.map((post) => ({ id: post.postId, kind: "post" as const, post }))} />
        </Show>
      </Show>
    </Show>
  );
}

function CommentsPanel(props: { comments: ProfileCommentItem[]; error?: string | null; loading?: boolean }) {
  return (
    <Show when={!props.error} fallback={<EmptyState label={props.error ?? "Unable to load comments."} />}>
      <Show when={!props.loading} fallback={<LoadingState />}>
        <Show when={props.comments.length > 0} fallback={<EmptyState label="No comments yet." />}>
          <ActivityItems items={props.comments.map((comment) => ({ comment, id: comment.commentId, kind: "comment" as const }))} />
        </Show>
      </Show>
    </Show>
  );
}

function ProfileStatsCard(props: { rightRail: ProfilePageRightRail }) {
  return (
    <Card class="overflow-hidden">
      <Show when={props.rightRail.description}>
        <Type as="p" class="p-5" variant="caption">{props.rightRail.description}</Type>
        <Separator />
      </Show>
      <dl class="grid grid-cols-2 gap-x-5 gap-y-5 p-5">
        <For each={props.rightRail.stats}>
          {(stat) => <div class="space-y-1"><dt><Type as="span" variant="caption">{stat.label}</Type></dt><Type as="dd" variant="h3">{formatStat(stat.value)}</Type><Show when={stat.note}><Type as="div" variant="caption">{stat.note}</Type></Show></div>}
        </For>
      </dl>
    </Card>
  );
}

function VerificationCard(props: { items: NonNullable<ProfilePageRightRail["verificationItems"]> }) {
  return (
    <Card class="overflow-hidden">
      <div class="border-b border-border px-5 py-4"><Type as="h2" variant="h4">Verification</Type></div>
      <For each={props.items}>
        {(item, index) => <><Show when={index() > 0}><Separator /></Show><div class="space-y-2 px-5 py-4"><div class="flex items-start justify-between gap-4"><Type variant="caption">{item.label}</Type><Type variant="body-strong">{item.value}</Type></div><Show when={item.note}><Type variant="caption">{item.note}</Type></Show></div></>}
      </For>
    </Card>
  );
}

function ProfileRail(props: { rightRail: ProfilePageRightRail }) {
  return (
    <aside class="flex flex-col gap-4">
      <ProfileStatsCard rightRail={props.rightRail} />
      <Show when={props.rightRail.verificationItems?.length}>
        <VerificationCard items={props.rightRail.verificationItems!} />
      </Show>
    </aside>
  );
}

function WalletPanel(props: { rightRail: ProfilePageRightRail }) {
  const sections = createMemo(() => props.rightRail.walletChainSections ?? profileWalletChainSections(props.rightRail.walletAssets, props.rightRail.walletAddress));
  return <WalletHub chainSections={sections()} variant="embedded" walletAddress={props.rightRail.walletAddress} />;
}

function TabLabel(props: { icon: "overview" | "posts" | "comments" | "wallet" | "book"; label: string; mobile: boolean }) {
  const Icon = props.icon === "overview" ? IconList : props.icon === "posts" ? IconFileText : props.icon === "comments" ? IconChatCircle : props.icon === "wallet" ? IconWallet : IconFileText;
  return props.mobile
    ? <><Icon aria-hidden="true" class="size-5" /><Type as="span" class="sr-only" variant="label">{props.label}</Type></>
    : <Type as="span" variant="label">{props.label}</Type>;
}

export function ProfilePage(props: ProfilePageProps) {
  const isMobile = createIsMobile();
  const hasWallet = createMemo(() => hasProfileWallet(props.rightRail));
  const hasBook = createMemo(() => Boolean(props.bookPanel));
  const readHashTab = () => {
    if (typeof window === "undefined") return undefined;
    const value = window.location.hash.replace(/^#/, "") as ProfilePageTab;
    return value || undefined;
  };
  const initialTab = () => resolveProfileTab(readHashTab() ?? props.defaultTab, hasWallet(), hasBook());
  const [activeTab, setActiveTab] = createSignal<ProfilePageTab>(initialTab());
  const overview = () => props.overviewItems ?? emptyActivities;
  const posts = () => props.posts ?? emptyPosts;
  const comments = () => props.comments ?? emptyComments;
  const tabColumns = () => isMobile() ? 3 + (hasWallet() ? 1 : 0) + (hasBook() ? 1 : 0) : undefined;
  const selectTab = (value: string) => {
    const next = resolveProfileTab(value as ProfilePageTab, hasWallet(), hasBook());
    setActiveTab(next);
    if (typeof window !== "undefined") window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${next}`);
  };

  createEffect(
    () => [hasWallet(), hasBook()] as const,
    () => {
      const next = resolveProfileTab(activeTab(), hasWallet(), hasBook());
      if (next !== activeTab()) setActiveTab(next);
    },
  );
  createEffect(
    () => typeof window !== "undefined",
    () => {
      if (typeof window === "undefined") return;
      const onHashChange = () => setActiveTab(resolveProfileTab(readHashTab(), hasWallet(), hasBook()));
      window.addEventListener("hashchange", onHashChange);
      onCleanup(() => window.removeEventListener("hashchange", onHashChange));
    },
  );
  createEffect(
    () => activeTab(),
    (tab) => {
      if (tab === "overview" || tab === "posts" || tab === "comments") props.onActivityTabChange?.(tab);
    },
  );

  return (
    <StandardRoutePage class={cn("bg-background text-foreground", props.class)} size="rail">
      <ContentRailShell
        class="pb-10"
        header={<ProfileHero onBookingCta={props.onBookingCta} onCommunitiesCta={props.onCommunitiesCta} onEditProfile={props.onEditProfile} onMessageProfile={props.onMessageProfile} profile={props.profile} stats={props.rightRail.stats} />}
        rail={isMobile() ? undefined : <ProfileRail rightRail={props.rightRail} />}
      >
        <Tabs onChange={selectTab} value={activeTab()}>
          <TabsList columns={tabColumns()} variant="underline">
            <TabsTrigger class="px-2 md:px-5" value="overview" variant="underline"><TabLabel icon="overview" label="Overview" mobile={isMobile()} /></TabsTrigger>
            <TabsTrigger class="px-2 md:px-5" value="posts" variant="underline"><TabLabel icon="posts" label="Posts" mobile={isMobile()} /></TabsTrigger>
            <TabsTrigger class="px-2 md:px-5" value="comments" variant="underline"><TabLabel icon="comments" label="Comments" mobile={isMobile()} /></TabsTrigger>
            <Show when={hasWallet()}>
              <TabsTrigger class="px-2 md:px-5" value="wallet" variant="underline"><TabLabel icon="wallet" label="Wallet" mobile={isMobile()} /></TabsTrigger>
            </Show>
            <Show when={hasBook()}>
              <TabsTrigger class="px-2 md:px-5" value="book" variant="underline"><TabLabel icon="book" label="Book" mobile={isMobile()} /></TabsTrigger>
            </Show>
          </TabsList>
          <TabsContent class="mt-4" value="overview"><ActivityPanel error={props.activityError} items={overview()} loading={props.activityLoading} /></TabsContent>
          <TabsContent class="mt-4" value="posts"><PostsPanel error={props.activityError} loading={props.activityLoading} posts={posts()} /></TabsContent>
          <TabsContent class="mt-4" value="comments"><CommentsPanel comments={comments()} error={props.activityError} loading={props.activityLoading} /></TabsContent>
          <Show when={hasWallet()}><TabsContent class="mt-4" value="wallet"><WalletPanel rightRail={props.rightRail} /></TabsContent></Show>
          <Show when={hasBook()}><TabsContent class="mt-4" value="book">{props.bookPanel}</TabsContent></Show>
        </Tabs>
      </ContentRailShell>
    </StandardRoutePage>
  );
}
