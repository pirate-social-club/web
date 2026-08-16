import { isServer } from "@solidjs/web";
import { createEffect, type Accessor, type Setter } from "solid-js";
import type { PublicVideoFeedItem } from "./api/public-feed";

const FEED_CACHE_KEY = "pirate-solid-public-video-feed";

export type FeedPosition = { activeId: string | null; scrollTop: number };

export function readFeedPosition(): FeedPosition {
  if (typeof window === "undefined") return { activeId: null, scrollTop: 0 };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(FEED_CACHE_KEY) ?? "null") as Partial<FeedPosition> | null;
    return {
      activeId: typeof parsed?.activeId === "string" ? parsed.activeId : null,
      scrollTop: typeof parsed?.scrollTop === "number" ? parsed.scrollTop : 0,
    };
  } catch {
    return { activeId: null, scrollTop: 0 };
  }
}

export function writeFeedPosition(position: FeedPosition): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(position));
  } catch {
    // Storage is optional in restricted browser contexts.
  }
}

export function resolveFeedActiveId(
  items: PublicVideoFeedItem[],
  preferredId: string | null,
): string | null {
  return items.some(item => item.post.post.id === preferredId)
    ? preferredId
    : items[0]?.post.post.id ?? null;
}

export function createFeedSessionPersistence(options: {
  feed: Accessor<HTMLDivElement | undefined>;
  activeId: Accessor<string | null>;
  setActiveId: Setter<string | null>;
  items: Accessor<PublicVideoFeedItem[]>;
}): void {
  let skippedInitialPersist = false;

  createEffect(
    () => options.activeId(),
    activeId => {
      if (isServer) return;
      // The restoration effect below must read the previous session value
      // before this owner writes its initial active item back to storage.
      if (!skippedInitialPersist) {
        skippedInitialPersist = true;
        return;
      }
      writeFeedPosition({ activeId, scrollTop: options.feed()?.scrollTop ?? 0 });
    },
  );

  createEffect(
    () => ({ activeId: options.activeId(), items: options.items() }),
    ({ activeId, items }) => {
      const nextActiveId = resolveFeedActiveId(items, activeId);
      if (nextActiveId !== activeId) options.setActiveId(nextActiveId);
    },
  );

  createEffect(
    () => isServer,
    server => {
      if (server) return;
      const element = options.feed();
      if (!element) return;
      const stored = readFeedPosition();
      const restoredActiveId = resolveFeedActiveId(options.items(), stored.activeId);
      if (restoredActiveId !== options.activeId()) options.setActiveId(restoredActiveId);
      let restoreFrame: number | undefined;
      if (stored.scrollTop > 0) {
        restoreFrame = requestAnimationFrame(() => { element.scrollTop = stored.scrollTop; });
      }
      const save = () => writeFeedPosition({ activeId: options.activeId(), scrollTop: element.scrollTop });
      element.addEventListener("scroll", save, { passive: true });
      return () => {
        if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame);
        element.removeEventListener("scroll", save);
        save();
      };
    },
  );
}
