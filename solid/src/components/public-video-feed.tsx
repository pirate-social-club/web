import { Errored, isPending, Loading } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import { Button } from "../design-system";
import { publicVideoFeedKey } from "../lib/api/public-feed";
import { useUiLocale } from "../lib/ui-locale";
import { getLocaleMessages } from "../locales";
import { createPublicVideoFeedData } from "./public-video-feed-data";
import PublicVideoFeedView from "./public-video-feed-view";

export default function PublicVideoFeed() {
  const { locale } = useUiLocale();
  const copy = () => getLocaleMessages(locale(), "feed");
  const feedData = createPublicVideoFeedData(locale);
  const queryClient = useQueryClient();
  let feed: HTMLDivElement | undefined;

  const retry = (reset: () => void) => {
    void queryClient.resetQueries({ queryKey: publicVideoFeedKey(locale(), null) }).then(reset);
  };

  return (
    <section
      ref={feed}
      id="public-video-feed"
      data-feed-status={feedData.query.isError ? "error" : feedData.query.data ? "ready" : "loading"}
      data-feed-pending={isPending(feedData.data) ? "true" : "false"}
      data-active-video="none"
      aria-label={copy().label}
      tabindex="0"
    >
      <Errored fallback={(_, reset) => (
        <p data-feed-error="true" role="alert">
          {copy().unavailable}
          <Button type="button" onClick={() => retry(reset)}>{copy().retry}</Button>
        </p>
      )}>
        <Loading fallback={<p data-feed-loading="true" role="status">{copy().loadingMore}</p>}>
          <PublicVideoFeedView
            query={feedData.query}
            items={feedData.items}
            nextCursor={feedData.nextCursor}
            loadMore={feedData.loadMore}
            copy={copy}
            locale={locale}
            feed={() => feed}
          />
        </Loading>
      </Errored>
    </section>
  );
}
