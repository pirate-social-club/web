"use client";

import { Avatar } from "@/components/primitives/avatar";
import { AvatarWithBadge } from "@/components/compositions/system/avatar-badge/avatar-with-badge";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import { SongItem } from "@/components/compositions/profiles/song-item/song-item";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type {
  PublicProfileProps,
  PublicProfileTab,
} from "./public-profile-page.types";
import { Type } from "@/components/primitives/type";

function PublicHero({ profile }: { profile: PublicProfileProps }) {
  const bannerStyle = profile.bannerSrc
    ? {
        backgroundImage: `url(${profile.bannerSrc})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : undefined;

  return (
    <section className="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
      <div
        className={cn("h-40 bg-muted", profile.bannerSrc && "bg-none")}
        style={bannerStyle}
      />
      <div className="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {profile.nationalityBadgeCountryCode && profile.nationalityBadgeLabel ? (
            <AvatarWithBadge
              avatarClassName="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
              badgeCountryCode={profile.nationalityBadgeCountryCode}
              badgeLabel={profile.nationalityBadgeLabel}
              badgeSize={36}
              fallback={profile.displayName}
              fallbackSeed={profile.avatarSeed}
              size="lg"
              src={profile.avatarSrc}
            />
          ) : (
            <Avatar
              className="-mt-16 size-24 border-background bg-card shadow-[var(--shadow-lg)]"
              fallback={profile.displayName}
              fallbackSeed={profile.avatarSeed}
              size="lg"
              src={profile.avatarSrc}
            />
          )}
          <div className="space-y-2">
            <div className="space-y-1">
              <Type as="h1" variant="h1">
                {profile.displayName}
              </Type>
              <Type as="div" variant="caption">
                {profile.tagline ?? profile.handle}
              </Type>
            </div>
            {profile.bio ? (
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}
            {profile.meta?.length ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
                {profile.meta.map((item) => (
                  <div className="flex items-center gap-2" key={item.label}>
                    <span className="font-medium text-foreground">{item.value}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <Card className="px-5 py-8 text-base leading-7 text-muted-foreground">
      {copy}
    </Card>
  );
}

function FeedStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function PostsPanel({ posts }: { posts: PublicProfileProps["posts"] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  if (!posts?.length) return <EmptyState copy={copy.emptyPosts} />;
  return (
    <FeedStack>
      {posts.map((item) => (
        <Card className="overflow-hidden" key={item.postId}>
          <PostCard className="border-b-0" {...item.post} />
        </Card>
      ))}
    </FeedStack>
  );
}

function SongsPanel({ songs }: { songs: PublicProfileProps["songs"] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  if (!songs?.length) return <EmptyState copy={copy.emptySongs} />;
  return (
    <Card className="overflow-hidden">
      {songs.map((s, i) => {
        const { scrobbleId: _id, ...songProps } = s;
        return (
          <div key={s.scrobbleId}>
            {i > 0 ? <Separator /> : null}
            <SongItem {...songProps} />
          </div>
        );
      })}
    </Card>
  );
}

function ScrobblesPanel({ scrobbles }: { scrobbles: PublicProfileProps["scrobbles"] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  if (!scrobbles?.length) return <EmptyState copy={copy.emptyScrobbles} />;
  return (
    <Card className="overflow-hidden">
      {scrobbles.map((s, i) => {
        const { scrobbleId: _id, ...songProps } = s;
        return (
          <div key={s.scrobbleId}>
            {i > 0 ? <Separator /> : null}
            <SongItem {...songProps} />
          </div>
        );
      })}
    </Card>
  );
}

function VideosPanel({ videos }: { videos: PublicProfileProps["videos"] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  if (!videos?.length) return <EmptyState copy={copy.emptyVideos} />;
  return (
    <FeedStack>
      {videos.map((item) => (
        <Card className="overflow-hidden" key={item.videoId}>
          <PostCard className="border-b-0" {...item.post} />
        </Card>
      ))}
    </FeedStack>
  );
}

function AboutPanel({
  bio,
  communities,
}: {
  bio?: string;
  communities?: PublicProfileProps["communities"];
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const hasContent = bio || communities?.length;
  if (!hasContent) return <EmptyState copy={copy.emptyAbout} />;

  return (
    <Card className="overflow-hidden">
      {bio ? <div className="px-5 py-5 text-base leading-7 text-foreground">{bio}</div> : null}
      {bio && communities?.length ? <Separator /> : null}
      {communities?.length ? (
        <div className="px-5 py-5">
          <Type as="div" variant="h4" className="mb-3 ">{copy.communitiesTitle}</Type>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {communities.map((c) =>
              c.href ? (
                <a
                  className="text-base font-medium text-primary hover:underline"
                  href={c.href}
                  key={c.label}
                >
                  {c.label}
                </a>
              ) : (
                <span className="text-base font-medium text-foreground" key={c.label}>
                  {c.label}
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function OpenInPirateFooter({ href }: { href?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  return (
    <div className="flex justify-center pb-8 pt-4">
      <Button asChild={Boolean(href)} size="lg" variant="default">
        {href ? <a href={href}>{copy.openInPirate}</a> : copy.openInPirate}
      </Button>
    </div>
  );
}

export function PublicProfilePage({
  className,
  communities,
  defaultTab = "posts",
  openInPirateHref,
  posts,
  songs,
  scrobbles,
  videos,
  ...profile
}: PublicProfileProps) {
  const { isRtl, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicProfile;
  const tabs: Array<{ value: PublicProfileTab; label: string }> = [
    ...(posts?.length ? [{ value: "posts" as const, label: copy.postsTab }] : []),
    ...(songs?.length ? [{ value: "songs" as const, label: copy.songsTab }] : []),
    ...(scrobbles?.length ? [{ value: "scrobbles" as const, label: copy.scrobblesTab }] : []),
    ...(videos?.length ? [{ value: "videos" as const, label: copy.videosTab }] : []),
    { value: "about", label: copy.aboutTab },
  ];
  const resolvedDefaultTab = tabs.some((tab) => tab.value === defaultTab)
    ? defaultTab
    : tabs[0]?.value ?? "about";

  return (
    <div className={cn("w-full min-h-screen bg-background text-foreground", className)}>
      <div className="flex flex-col gap-6 pb-10">
        <PublicHero profile={profile} />

        <Tabs className="flex flex-col gap-6" defaultValue={resolvedDefaultTab}>
          {tabs.length > 1 ? (
            <TabsList
              className={cn(
                "h-auto w-full gap-2 overflow-x-auto rounded-[var(--radius-3xl)] bg-muted/80 p-1.5",
                isRtl ? "justify-end" : "justify-start",
              )}
            >
              {tabs.map((tab) => (
                <TabsTrigger className="min-w-fit" key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}

          {posts?.length ? (
            <TabsContent className="mt-0" value="posts">
              <PostsPanel posts={posts} />
            </TabsContent>
          ) : null}
          {songs?.length ? (
            <TabsContent className="mt-0" value="songs">
              <SongsPanel songs={songs} />
            </TabsContent>
          ) : null}
          {scrobbles?.length ? (
            <TabsContent className="mt-0" value="scrobbles">
              <ScrobblesPanel scrobbles={scrobbles} />
            </TabsContent>
          ) : null}
          {videos?.length ? (
            <TabsContent className="mt-0" value="videos">
              <VideosPanel videos={videos} />
            </TabsContent>
          ) : null}
          <TabsContent className="mt-0" value="about">
            <AboutPanel bio={profile.bio} communities={communities} />
          </TabsContent>
        </Tabs>

        <OpenInPirateFooter href={openInPirateHref} />
      </div>
    </div>
  );
}
