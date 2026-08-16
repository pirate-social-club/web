import { For, Show, createEffect, createMemo, createSignal, type Accessor } from "solid-js";
import { isServer } from "@solidjs/web";
import { Button } from "../design-system";
import { RequireSession } from "../lib/auth/require-session";
import { normalizeAuthorUser, type PublicVideoFeedItem } from "../lib/api/public-feed";
import { createFeedSessionPersistence } from "../lib/public-video-feed-session";
import { createPublicVideoFeedPlayback } from "../lib/public-video-feed-playback";
import { resolveLocaleLanguageTag } from "../lib/ui-locale";
import { getLocaleMessages, interpolateMessage } from "../locales";
import type { PublicVideoFeedQuery } from "./public-video-feed-data";
import type { UiLocaleCode } from "../lib/ui-locale-core";

type FeedCopy = ReturnType<typeof getLocaleMessages<"feed">>;

function videoForItem(
  item: PublicVideoFeedItem,
  fallback: { title: string; author: string },
) {
  const media = item.post.post.media_refs?.find(ref => ref.mime_type?.startsWith("video/"))
    ?? item.post.post.media_refs?.[0];
  return {
    source: media?.storage_ref ?? "",
    poster: media?.poster_ref ?? undefined,
    title: item.post.post.title?.trim() || fallback.title,
    caption: item.post.post.caption?.trim() || "",
    author: normalizeAuthorUser(item.post.post.author_user) ?? fallback.author,
  };
}

export default function PublicVideoFeedView(props: {
  query: PublicVideoFeedQuery;
  items: Accessor<PublicVideoFeedItem[]>;
  nextCursor: Accessor<string | null>;
  loadMore: () => void;
  copy: Accessor<FeedCopy>;
  locale: Accessor<UiLocaleCode>;
  feed: Accessor<HTMLDivElement | undefined>;
}) {
  const [activeId, setActiveId] = createSignal<string | null>(props.items()[0]?.post.post.id ?? null);
  const activeIndex = createMemo(() => props.items().findIndex(item => item.post.post.id === activeId()));
  const playback = createPublicVideoFeedPlayback({ feed: props.feed, activeId, setActiveId });
  createFeedSessionPersistence({ feed: props.feed, activeId, setActiveId, items: props.items });

  createEffect(
    () => isServer,
    server => {
      if (server) return;
      const element = props.feed();
      if (!element) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        scrollToItem(event.key === "ArrowDown" ? 1 : -1);
      };
      element.addEventListener("keydown", onKeyDown);
      return () => element.removeEventListener("keydown", onKeyDown);
    },
  );

  function scrollToItem(offset: number): void {
    const index = Math.max(0, Math.min(props.items().length - 1, activeIndex() + offset));
    const item = props.items()[index];
    if (!item) return;
    setActiveId(item.post.post.id);
    playback.cards.get(item.post.post.id)?.scrollIntoView({
      behavior: playback.reducedMotion() ? "auto" : "smooth",
      block: "center",
    });
  }

  return (
    <>
      <Show when={props.items().length === 0}>
        <p data-feed-empty="true">{props.copy().empty}</p>
      </Show>
      <For each={props.items()}>
        {(item, index) => {
          const video = videoForItem(item, {
            title: props.copy().fallbackTitle,
            author: props.copy().fallbackAuthor,
          });
          const id = item.post.post.id;
          return (
            <article
              ref={element => playback.registerCard(id, element)}
              data-feed-item-id={id}
              data-feed-index={index()}
              data-feed-active={activeId() === id ? "true" : "false"}
              class="public-video-card"
              tabindex="-1"
            >
              <video
                ref={element => playback.registerVideo(id, element)}
                src={video.source || undefined}
                poster={video.poster}
                controls
                playsinline
                muted
                preload={index() === activeIndex() + 1 ? "auto" : "metadata"}
                aria-label={interpolateMessage(props.copy().videoLabel, { title: video.title })}
                aria-describedby={`video-caption-${id}`}
              >
                <track
                  kind="captions"
                  label={props.copy().videoDescription}
                  srclang={resolveLocaleLanguageTag(props.locale())}
                />
              </video>
              <div class="public-video-card__scrim">
                <h2>{video.title}</h2>
                <p id={`video-caption-${id}`}>
                  {video.caption || interpolateMessage(props.copy().videoBy, { author: video.author })}
                </p>
                <p data-video-author={video.author}>
                  {interpolateMessage(props.copy().byAuthor, { author: video.author })}
                </p>
                <div class="public-video-card__actions">
                  <RequireSession>
                    <Button type="button" disabled aria-disabled="true" data-auth-action="like">
                      {props.copy().likeRequiresSession}
                    </Button>
                  </RequireSession>
                  <Button type="button" onClick={() => {
                    const element = playback.videos.get(id);
                    if (!element) return;
                    if (element.paused) { setActiveId(id); void element.play(); } else element.pause();
                  }} data-video-toggle={id}>
                    {activeId() === id ? props.copy().pause : props.copy().play}
                  </Button>
                </div>
              </div>
            </article>
          );
        }}
      </For>
      <Show when={props.nextCursor()}>
        <Button type="button" onClick={props.loadMore} disabled={props.query.isFetchingNextPage} data-feed-load-more>
          {props.query.isFetchingNextPage ? props.copy().loadingMore : props.copy().loadMore}
        </Button>
      </Show>
      <Show when={props.query.isError && !props.query.isPending}>
        <p data-feed-pagination-error="true" role="alert">{props.copy().paginationError}</p>
      </Show>
    </>
  );
}
