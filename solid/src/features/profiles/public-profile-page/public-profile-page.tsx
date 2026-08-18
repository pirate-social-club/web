/** @jsxImportSource @solidjs/web */

import { For, Show, createSignal } from "solid-js";

import {
  Avatar,
  AvatarBadge,
  Card,
  Separator,
  Type,
  buttonVariants,
  cn,
} from "../../../design-system";
import type { PostCardProps } from "../../posts/post-card/types";
import { PostCard } from "../../posts/post-card/post-card";
import { PublicRoutePage } from "../../shell/page-shell";
import { SongItem, type SongItemMetaItem } from "../song-item/song-item";

export type PublicProfileTab = "posts" | "songs" | "videos" | "about";

interface PublicProfileCommunity {
  label: string;
  href?: string;
}

export interface PublicProfilePostItem {
  postId: string;
  post: PostCardProps;
}

export interface PublicProfileSongItem {
  songId: string;
  title: string;
  titleHref?: string;
  artistName?: string;
  artworkSrc?: string;
  artworkAlt?: string;
  metaItems?: SongItemMetaItem[];
}

export interface PublicProfileVideoItem {
  videoId: string;
  post: PostCardProps;
}

export interface PublicProfileProps {
  displayName: string;
  handle: string;
  tagline?: string;
  bio?: string;
  avatarSeed?: string;
  avatarSrc?: string;
  nationalityBadgeCountryCode?: string | null;
  nationalityBadgeLabel?: string;
  bannerSrc?: string;
  meta?: Array<{ label: string; value: string }>;
  communities?: readonly PublicProfileCommunity[];
  posts?: readonly PublicProfilePostItem[];
  songs?: readonly PublicProfileSongItem[];
  videos?: readonly PublicProfileVideoItem[];
  defaultTab?: PublicProfileTab;
  openInPirateHref?: string;
  class?: string;
  flagUrlForCountryCode?: (countryCode: string) => string;
}

export function PublicProfilePage(props: PublicProfileProps) {
  const tabsForProfile = () => [
    ...(props.posts?.length ? [{ id: "posts" as const, label: "Posts" }] : []),
    ...(props.songs?.length ? [{ id: "songs" as const, label: "Songs" }] : []),
    ...(props.videos?.length ? [{ id: "videos" as const, label: "Videos" }] : []),
    { id: "about" as const, label: "About" },
  ];
  const initialTab = () => {
    const requested = props.defaultTab ?? "posts";
    return tabsForProfile().some((tab) => tab.id === requested)
      ? requested
      : tabsForProfile()[0]?.id ?? "about";
  };
  const [selectedTab, setSelectedTab] = createSignal<PublicProfileTab>(initialTab());
  const activeTab = () => selectedTab();
  const focusTab = (tab: PublicProfileTab) => {
    setSelectedTab(tab);
    if (typeof document !== "undefined") {
      queueMicrotask(() => document.getElementById(`profile-tab-${tab}`)?.focus());
    }
  };
  const handleTabKeyDown = (event: KeyboardEvent, tab: PublicProfileTab) => {
    const profileTabs = tabsForProfile();
    const index = profileTabs.findIndex((item) => item.id === tab);
    if (index < 0) return;
    const nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? (index + 1) % profileTabs.length
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? (index - 1 + profileTabs.length) % profileTabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? profileTabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    focusTab(profileTabs[nextIndex]!.id);
  };
  const panelLabelId = () => tabsForProfile().length > 1
    ? `profile-tab-${activeTab()}`
    : `profile-heading-${activeTab()}`;
  const hasAboutContent = () => Boolean(props.bio || props.communities?.length);
  const bannerStyle = () => props.bannerSrc
    ? {
        "background-image": `url(${props.bannerSrc})`,
        "background-position": "center",
        "background-size": "cover",
      }
    : undefined;
  const hasNationalityBadge = () => Boolean(props.nationalityBadgeCountryCode && props.nationalityBadgeLabel);

  return (
    <PublicRoutePage size="rail">
      <main class={cn("flex flex-col gap-6", props.class)}>
        <section class="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
          <div class={cn("h-40 bg-muted", props.bannerSrc && "bg-none")} style={bannerStyle()} />
          <div class="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Show
                when={hasNationalityBadge()}
                fallback={(
                  <Avatar
                    class="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
                    fallback={props.displayName}
                    fallbackSeed={props.avatarSeed}
                    size="lg"
                    src={props.avatarSrc}
                  />
                )}
              >
                <AvatarBadge
                  avatarClass="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
                  badgeCountryCode={props.nationalityBadgeCountryCode}
                  badgeLabel={props.nationalityBadgeLabel ?? "Verified"}
                  badgeSize={36}
                  fallback={props.displayName}
                  fallbackSeed={props.avatarSeed}
                  flagUrlForCountryCode={props.flagUrlForCountryCode}
                  size="lg"
                  src={props.avatarSrc}
                />
              </Show>
              <div class="space-y-2">
                <div class="space-y-1">
                  <Type as="h1" variant="h1">{props.displayName}</Type>
                  <Type as="div" variant="caption">{props.tagline ?? props.handle}</Type>
                </div>
                <Show when={props.bio}>
                  {(bio) => <Type as="p" class="max-w-3xl text-muted-foreground" variant="body">{bio()}</Type>}
                </Show>
                <Show when={props.meta?.length}>
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <For each={props.meta}>
                      {(item) => (
                        <Type as="div" class="flex items-center gap-2 text-muted-foreground" variant="body">
                          <Type as="span" variant="body-strong">{item.value}</Type>
                          <span>{item.label}</span>
                        </Type>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </section>

        <div class="flex flex-col gap-6">
          <Show when={tabsForProfile().length > 1}>
            <nav aria-label="Profile sections" class="flex h-auto w-full gap-2 overflow-x-auto rounded-[var(--radius-3xl)] bg-muted/80 p-1.5" role="tablist">
              <For each={tabsForProfile()}>
              {(tab) => (
                <button
                  aria-controls={`profile-panel-${tab.id}`}
                  aria-selected={activeTab() === tab.id ? "true" : "false"}
                  class={cn(
                    "min-w-fit rounded-full px-4 py-2 transition-colors hover:bg-background/70",
                    activeTab() === tab.id && "bg-background shadow-sm",
                  )}
                  id={`profile-tab-${tab.id}`}
                  onClick={() => focusTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  role="tab"
                  tabindex={activeTab() === tab.id ? 0 : -1}
                  type="button"
                >
                  <Type as="span" variant="label">{tab.label}</Type>
                </button>
              )}
              </For>
            </nav>
          </Show>

          <section aria-labelledby={panelLabelId()} id={`profile-panel-${activeTab()}`} role="tabpanel" tabindex="0">
            <Show when={activeTab() === "posts"}>
              <div class="space-y-3">
                <Type as="h2" class="sr-only" variant="h2">Posts</Type>
                <Show when={props.posts?.length} fallback={<EmptyProfileState label="No posts yet" />}>
                  <For each={props.posts}>
                    {(item) => <Card class="overflow-hidden"><PostCard class="border-b-0" {...item.post} postId={item.postId} /></Card>}
                  </For>
                </Show>
              </div>
            </Show>

            <Show when={activeTab() === "songs"}>
              <Show when={props.songs?.length} fallback={<EmptyProfileState label="No songs yet" />}>
                <Card class="overflow-hidden">
                    <For each={props.songs}>
                      {(song, index) => (
                        <>
                          <Show when={index() > 0}><Separator /></Show>
                        <SongItem
                          artistName={song.artistName}
                          artworkAlt={song.artworkAlt}
                          artworkSrc={song.artworkSrc}
                          metaItems={song.metaItems}
                          title={song.title}
                          titleHref={song.titleHref}
                        />
                        </>
                      )}
                    </For>
                </Card>
              </Show>
            </Show>

            <Show when={activeTab() === "videos"}>
              <div class="space-y-3">
                <Type as="h2" class="sr-only" variant="h2">Videos</Type>
                <Show when={props.videos?.length} fallback={<EmptyProfileState label="No videos yet" />}>
                  <For each={props.videos}>
                    {(item) => <Card class="overflow-hidden"><PostCard class="border-b-0" {...item.post} postId={item.videoId} /></Card>}
                  </For>
                </Show>
              </div>
            </Show>

            <Show when={activeTab() === "about"}>
              <Show
                when={hasAboutContent()}
                fallback={(
                  <Card>
                    <div class="px-5 py-8">
                      <Type as="p" class="text-muted-foreground" id="profile-heading-about" variant="body">No info yet.</Type>
                    </div>
                  </Card>
                )}
              >
                <Card class="overflow-hidden">
                  <Type as="h2" class="sr-only" id="profile-heading-about" variant="h2">About</Type>
                  <Show when={props.bio}>
                    {(bio) => <div class="p-5"><Type as="p" variant="body">{bio()}</Type></div>}
                  </Show>
                  <Show when={props.bio && props.communities?.length}><Separator /></Show>
                  <Show when={props.communities?.length}>
                    <div class="p-5">
                      <Type as="h3" class="mb-3" variant="h3">Communities</Type>
                      <ul class="flex flex-wrap gap-x-5 gap-y-2">
                        <For each={props.communities}>
                          {(community) => (
                            <li>
                              <Show
                                when={community.href}
                                fallback={<Type as="span" variant="body-strong">{community.label}</Type>}
                              >
                                {(href) => <a class="text-primary hover:underline" href={href()}><Type as="span" variant="body-strong">{community.label}</Type></a>}
                              </Show>
                            </li>
                          )}
                        </For>
                      </ul>
                    </div>
                  </Show>
                </Card>
              </Show>
            </Show>
          </section>
        </div>

        <div class="flex justify-center pb-8 pt-4">
          <Show
            when={props.openInPirateHref}
            fallback={<button class={buttonVariants()} type="button"><Type as="span" class="text-primary-foreground" variant="label">Open in Pirate</Type></button>}
          >
            {(href) => <a class={buttonVariants()} href={href()}><Type as="span" class="text-primary-foreground" variant="label">Open in Pirate</Type></a>}
          </Show>
        </div>
      </main>
    </PublicRoutePage>
  );
}

function EmptyProfileState(props: { label: string }) {
  return <Card><div class="p-6"><Type as="p" class="text-muted-foreground" variant="body">{props.label}</Type></div></Card>;
}
