import { Show, createSignal } from "solid-js";

import { Avatar, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Type, VerticalFeed, cn, type MediaPostData } from "../../../design-system";
import { fetchPublicVideoFeedPage } from "../../../lib/api/public-feed";
import type { VideoFeedItem } from "./video-feed.types";
import { canPlayVideo, getMediaWindowIds, getVideoFeedActionLabel, narrowVideoFeedItems, toVerticalFeedPost } from "./video-feed-model";

export type PublicVideoFeedPageLoader = typeof fetchPublicVideoFeedPage;

export interface VideoFeedProps {
  items: VideoFeedItem[];
  class?: string;
  initialItemId?: string;
  initialMuted?: boolean;
  externallyPausedItemId?: string;
  loading?: boolean;
  hasMore?: boolean;
  paginationError?: string;
  paginationPaused?: boolean;
  onLoadMore?: () => void;
  onLike?: (item: VideoFeedItem) => void;
  onComment?: (item: VideoFeedItem) => void;
  onShare?: (item: VideoFeedItem) => void;
  onBook?: (item: VideoFeedItem) => void;
  onBoost?: (item: VideoFeedItem) => void;
  onStudy?: (item: VideoFeedItem) => void;
  onKaraoke?: (item: VideoFeedItem) => void;
  onSong?: (item: VideoFeedItem) => void;
  onGateRequired?: (item: VideoFeedItem) => void;
  onPublisherRelationship?: (item: VideoFeedItem) => void;
  onDownvote?: (item: VideoFeedItem, downvoted: boolean) => void;
  onViewed?: (item: VideoFeedItem) => void;
  onActiveItemChange?: (item: VideoFeedItem, index: number) => void;
}

function VideoOverflowMenu(props: { class?: string; downvoted: boolean; onDownvote: () => void; triggerLabel: string }) {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger aria-label={props.triggerLabel} class={cn("inline-flex items-center rounded-md px-3 py-2 text-white hover:bg-white/15", props.class)} data-video-overflow-trigger>
        More
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Video overflow actions" class="min-w-44">
        <DropdownMenuItem onSelect={props.onDownvote}>
          {props.downvoted ? "Remove downvote" : "Downvote video"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Product adapter around the shared snap feed. It owns product action intent, while API I/O stays in the host. */
export function VideoFeed(props: VideoFeedProps) {
  const items = () => narrowVideoFeedItems(props.items);
  const posts = (): MediaPostData[] => items().map(toVerticalFeedPost);
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [likedIds, setLikedIds] = createSignal<Set<string>>(new Set());
  // Media starts muted for autoplay policy. initialMuted=false means the viewer
  // has not persisted a mute choice, so the host may show the tap-for-sound hint.
  const [muted, setMuted] = createSignal(true);
  const soundPrompt = () => muted() && props.initialMuted === false;
  const [followedIds, setFollowedIds] = createSignal<Set<string>>(new Set());
  const [downvoteStates, setDownvoteStates] = createSignal<Map<string, boolean>>(new Map());
  const [translatedIds, setTranslatedIds] = createSignal<Set<string>>(new Set());
  const [progress, setProgress] = createSignal(0);
  const [duration, setDuration] = createSignal(100);
  let feedRootRef: HTMLDivElement | undefined;
  const activeItem = () => items()[activeIndex()];
  const mediaWindowIds = () => new Set(getMediaWindowIds(items(), activeIndex(), 2));
  const canBook = (item: VideoFeedItem) => {
    const booking = item.booking;
    return Boolean(booking?.hasAvailableSlot && booking.startingPriceCents !== null && booking.startingPriceCents !== undefined);
  };
  const guarded = (item: VideoFeedItem, action: () => void) => {
    if (item.interactionGate === "membership_required" || item.viewerState === "age_proof_required") {
      props.onGateRequired?.(item);
      return;
    }
    action();
  };
  const like = (item: VideoFeedItem) => guarded(item, () => {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
    props.onLike?.(item);
  });
  const verticalPosts = () => posts().map((post) => ({
    ...post,
    videoUrl: mediaWindowIds().has(post.id) ? post.videoUrl : undefined,
    isLiked: likedIds().has(post.id) || post.isLiked,
    isFollowing: followedIds().has(post.id) || post.isFollowing,
  }));
  const activeVideo = () => {
    const videos = feedRootRef?.querySelectorAll<HTMLVideoElement>("video");
    if (!videos?.length) return undefined;
    let mediaOrdinal = 0;
    for (const [index, post] of verticalPosts().entries()) {
      if (!post.videoUrl) continue;
      if (index === activeIndex()) return videos[mediaOrdinal];
      mediaOrdinal += 1;
    }
    return undefined;
  };
  const seekActiveMedia = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const next = Number(event.currentTarget.value);
    if (!Number.isFinite(next)) return;
    const video = activeVideo();
    if (video) video.currentTime = next;
    setProgress(next);
  };
  const active = () => activeItem();
  const handleMediaTimeUpdate = (postId: string, currentTime: number, mediaDuration: number) => {
    const resolved = items().find((item) => item.id === postId);
    if (!resolved || resolved.id !== active()?.id) return;
    if (Number.isFinite(currentTime)) setProgress(currentTime);
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) setDuration(mediaDuration);
  };
  const action = (name: string, callback: ((item: VideoFeedItem) => void) | undefined) => {
    const item = active();
    if (!item || !callback) return;
    guarded(item, () => callback(item));
  };
  const relationshipLabel = (item: VideoFeedItem) => {
    const relationship = item.publisher.relationship;
    if (!relationship) return "Publisher";
    if (relationship.kind === "follow") return followedIds().has(item.id) ? "Following" : "Follow";
    if (relationship.active) return relationship.label;
    return relationship.pending ? "Join requested" : relationship.label;
  };
  const relationshipDisabled = (item: VideoFeedItem) => {
    const relationship = item.publisher.relationship;
    return relationship?.kind === "join" && relationship.disabled === true;
  };
  const handleRelationship = (item: VideoFeedItem) => guarded(item, () => {
    if (item.publisher.relationship?.kind === "follow") {
      setFollowedIds((current) => {
        const next = new Set(current);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
    }
    props.onPublisherRelationship?.(item);
  });
  const isDownvoted = (item: VideoFeedItem) => downvoteStates().has(item.id)
    ? downvoteStates().get(item.id) === true
    : item.downvoted === true;
  const toggleDownvote = (item: VideoFeedItem) => {
    guarded(item, () => {
      const nextDownvoted = !isDownvoted(item);
      setDownvoteStates((current) => {
        const next = new Map(current);
        next.set(item.id, nextDownvoted);
        return next;
      });
      props.onDownvote?.(item, nextDownvoted);
    });
  };
  const toggleTranslation = (item: VideoFeedItem) => {
    setTranslatedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  };

  return (
    <div class={cn("group relative h-full min-h-[100dvh] w-full overflow-hidden bg-black", props.class)} data-video-feed ref={(element) => { feedRootRef = element; }}>
      <VerticalFeed
        feedLabel="Video feed"
        hasMobileFooter
        hasMore={props.hasMore}
        initialPostId={props.initialItemId}
        loading={props.loading}
        muted={muted()}
        pausedPostId={props.externallyPausedItemId}
        showChrome={false}
        onActivePostChange={(id, index) => {
          setActiveIndex(index);
          const item = items()[index];
          if (item) props.onActiveItemChange?.(item, index);
        }}
        onAuthorClick={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) props.onPublisherRelationship?.(item);
        }}
        onEndReached={props.onLoadMore}
        onLikeClick={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) like(item);
        }}
        onFollowClick={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) handleRelationship(item);
        }}
        onMuteToggle={(_id, nextMuted) => setMuted(nextMuted)}
        onShareClick={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) guarded(item, () => props.onShare?.(item));
        }}
        onSoundtrackClick={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) guarded(item, () => props.onSong?.(item));
        }}
        onTimeUpdate={handleMediaTimeUpdate}
        onViewed={(id) => {
          const item = items().find((candidate) => candidate.id === id);
          if (item) props.onViewed?.(item);
        }}
        posts={verticalPosts()}
      />

      <Show when={active()}>
        {(item) => (
          <div class="pointer-events-none absolute inset-0 z-20" data-video-active-overlay={item().id}>
            <div class="pointer-events-auto absolute inset-x-4 bottom-20 flex items-end justify-between gap-4 md:bottom-6">
              <div class="max-w-[65%] space-y-1 text-white">
                <div class="flex items-center gap-2" data-publisher-identity>
                  <Avatar fallback={item().publisher.handle} size="sm" src={item().publisher.avatarSrc} />
                  <Show when={item().publisher.href} fallback={<Type as="h2" class="text-white" variant="h3">@{item().publisher.handle}</Type>}>
                    {(href) => <a class="text-white underline-offset-2 hover:underline" href={href()} rel={item().publisher.external ? "noreferrer" : undefined} target={item().publisher.external ? "_blank" : undefined}><Type as="span" class="text-white" variant="h3">@{item().publisher.handle}</Type></a>}
                  </Show>
                </div>
                <Show when={item().publisher.relationship}>
                  <Button aria-label={relationshipLabel(item())} disabled={relationshipDisabled(item())} onClick={() => handleRelationship(item())} type="button" variant="secondary">{relationshipLabel(item())}</Button>
                </Show>
                <Show when={item().caption}>
                  <Type class="text-white" dir={translatedIds().has(item().id) ? item().translation?.originalDir : item().captionDir} lang={translatedIds().has(item().id) ? item().translation?.originalLang : item().captionLang} variant="body">
                    {(() => {
                      const current = item();
                      return current.translation && translatedIds().has(current.id)
                        ? current.translation.originalCaption
                        : current.caption;
                    })()}
                  </Type>
                </Show>
                <Show when={item().translation}>
                  {(translation) => <Button aria-label={translatedIds().has(item().id) ? translation().showTranslationLabel : translation().showOriginalLabel} data-video-translation onClick={() => toggleTranslation(item())} type="button" variant="ghost">{translatedIds().has(item().id) ? translation().showTranslationLabel : translation().showOriginalLabel}</Button>}
                </Show>
                <Show when={item().song}><Type class="text-white" variant="caption">{item().song?.title} · {item().song?.artist}</Type></Show>
                <Type aria-live="polite" class="text-white" variant="caption">{getVideoFeedActionLabel(item())}</Type>
              </div>
              <div aria-label="Video actions" class="flex max-w-[35%] flex-col items-end gap-2">
                <Button aria-label="Comment on video" onClick={() => action("comment", props.onComment)} type="button" variant="secondary">Comments {item().commentCount}</Button>
                <Button aria-label={likedIds().has(item().id) ? "Unlike video" : "Like video"} aria-pressed={likedIds().has(item().id) ? "true" : "false"} onClick={() => like(item())} type="button" variant="secondary">{likedIds().has(item().id) ? "Liked" : "Like"} {item().likeCount}</Button>
                <Show when={canBook(item())}>
                  <Button onClick={() => action("book", props.onBook)} type="button" variant="secondary">Book</Button>
                </Show>
                <Show when={item().study === "ready"}><Button onClick={() => action("study", props.onStudy)} type="button" variant="secondary">Study</Button></Show>
                <Show when={item().karaoke === "ready"}><Button onClick={() => action("karaoke", props.onKaraoke)} type="button" variant="secondary">Sing</Button></Show>
                <Show when={item().boostEligibility === "eligible"}><Button onClick={() => action("boost", props.onBoost)} type="button" variant="secondary">Boost</Button></Show>
                <Show when={item().song}><Button onClick={() => action("song", props.onSong)} type="button" variant="ghost">Open song</Button></Show>
                <VideoOverflowMenu downvoted={isDownvoted(item())} onDownvote={() => toggleDownvote(item())} triggerLabel="More video actions" />
              </div>
            </div>
            <div class="pointer-events-auto absolute inset-x-4 top-4 hidden items-center gap-2 opacity-0 transition-opacity md:flex md:group-focus-within:opacity-100 md:group-hover:opacity-100" data-video-hover-controls>
              <Button aria-label={muted() ? "Tap for sound" : "Mute video"} onClick={() => setMuted((current) => !current)} type="button" variant="secondary">{muted() ? "Tap for sound" : "Mute"}</Button>
              <VideoOverflowMenu class="bg-black/60" downvoted={isDownvoted(item())} onDownvote={() => toggleDownvote(item())} triggerLabel="More" />
            </div>
            <div class="pointer-events-auto absolute inset-x-4 bottom-4 hidden md:block" data-video-progress>
              <input aria-label="Video progress" class="w-full accent-primary" max={duration()} min="0" onInput={seekActiveMedia} step="0.1" type="range" value={progress()} />
            </div>
            <Show when={soundPrompt()}>
              <div class="pointer-events-auto absolute inset-x-0 top-4 flex justify-center" data-video-audio-prompt>
                <Button aria-label="Tap for sound" class="rounded-full bg-black/75 px-3 py-1 text-white" onClick={() => setMuted(false)} type="button" variant="ghost">Tap for sound</Button>
              </div>
            </Show>
            <Show when={!muted()}>
              <div class="absolute inset-x-0 top-4 flex justify-center" data-video-audio-state>
                <Type class="rounded-full bg-black/75 px-3 py-1 text-white" variant="caption">Sound on</Type>
              </div>
            </Show>
            <Show when={!canPlayVideo(item())}>
              <div class="pointer-events-auto absolute inset-0 grid place-items-center bg-black/55" role="status">
                <Type class="max-w-sm text-center text-white" variant="body-strong">{item().viewerState === "age_proof_required" ? "Age proof is required to play this video." : "This video has no playable source."}</Type>
              </div>
            </Show>
            <Show when={props.externallyPausedItemId === item().id}>
              <div class="absolute inset-x-0 top-4 flex justify-center"><Type class="rounded-full bg-black/75 px-3 py-1 text-white" variant="caption">Playback paused for panel</Type></div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
