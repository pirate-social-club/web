/** @jsxImportSource @solidjs/web */
import { For, Show, createMemo, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Button, Card, CardContent, Type } from "../../../design-system";
import { feedTranslationLabel, filterFeedItems, paginateFeed, sortFeedItems, type FeedItem, type FeedSort, type FeedState } from "./feed-model";

const homeItems: readonly FeedItem[] = [
  { id: "home-video", author: "ana.pirate", title: "A live set from Tbilisi", body: "The room was tiny, the chorus was huge, and the final take is here.", score: 18, publishedAt: "2026-08-16T08:00:00Z", community: "music", media: "video", publishState: "published" },
  { id: "home-song", author: "bo.pirate", title: "New demo: Rustavi night drive", body: "A rough mix and a note about the bass line.", score: 42, publishedAt: "2026-08-15T18:00:00Z", community: "music", media: "song", publishState: "published" },
  { id: "home-text", author: "cy.pirate", title: "What are you listening to?", body: "Drop one record you would play for a room of strangers.", score: 9, publishedAt: "2026-08-14T12:00:00Z", community: "conversation", publishState: "published" },
];

const communityItems: readonly FeedItem[] = [
  { id: "community-long", author: "dana.pirate", title: "A long-form production note", body: "The first pass was too bright. After moving the room microphone and leaving more silence between phrases, the whole arrangement found its shape. This preview deliberately keeps the long body readable without collapsing the card.", score: 33, publishedAt: "2026-08-12T12:00:00Z", community: "tame-impala", publishState: "published" },
  { id: "community-translation", author: "nino.pirate", title: "სცენის ჩანაწერები", body: "Translated preview: notes from the local scene.", score: 11, publishedAt: "2026-08-11T12:00:00Z", community: "tame-impala", translation: "translated", publishState: "published" },
  { id: "community-draft", author: "mod.pirate", title: "Scheduled listening thread", body: "Visible in the moderation preview, not yet public.", score: 4, publishedAt: "2026-08-10T12:00:00Z", community: "tame-impala", publishState: "scheduled" },
];

const yourCommunitiesItems: readonly FeedItem[] = [
  ...communityItems,
  { id: "your-gaming", author: "fox.pirate", title: "Build notes", body: "A community post from a second space.", score: 21, publishedAt: "2026-08-09T12:00:00Z", community: "games", publishState: "published" },
];

const sorts: readonly FeedSort[] = ["best", "new", "top"];

export function FeedBoard(props: {
  items: readonly FeedItem[];
  state?: FeedState;
  emptyTitle?: string;
  emptyBody?: string;
  community?: string;
  mobile?: boolean;
  asideTitle?: string;
  showFlairFilter?: boolean;
  showPagination?: boolean;
  loadingMore?: boolean;
  paginationError?: boolean;
}) {
  const [sort, setSort] = createSignal<FeedSort>("best");
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [pageState, setPageState] = createSignal<"idle" | "loading" | "error">("idle");
  const filtered = createMemo(() => filterFeedItems(props.items, props.community));
  const sorted = createMemo(() => sortFeedItems(filtered(), sort()));
  const page = createMemo(() => paginateFeed(sorted(), cursor(), 3));
  const visibleItems = createMemo(() => page().items);
  const state = () => props.state ?? "ready";
  const loadMore = () => {
    if (!page().nextCursor) return;
    setPageState("loading");
    setCursor(page().nextCursor);
    setPageState("idle");
  };

  return (
    <div class={props.mobile ? "w-full" : "mx-auto w-full max-w-5xl"} data-feed-state={state()}>
      <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <main class="flex min-w-0 flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-3">
            <Type variant="h2">Feed</Type>
            <label class="flex items-center gap-2"><Type as="span" variant="label">Sort</Type><select aria-label="Sort posts" onChange={(event) => { setSort(event.currentTarget.value as FeedSort); setCursor(null); }} value={sort()}>{sorts.map((option) => <option value={option}>{option}</option>)}</select></label>
          </div>
          <Show when={props.showFlairFilter}><Button variant="secondary"><Type as="span" variant="label">Filter by flair</Type></Button></Show>
          <Show when={state() === "loading"}>
            <Card><CardContent class="p-6"><Type variant="body">Loading feed…</Type></CardContent></Card>
          </Show>
          <Show when={state() === "error" || pageState() === "error"}>
            <Card role="alert"><CardContent class="p-6"><Type variant="body">We could not load the next page. Try again.</Type></CardContent></Card>
          </Show>
          <Show when={props.paginationError}>
            <Card role="alert"><CardContent class="p-6"><Type variant="body">The next page failed to load; existing posts remain visible.</Type></CardContent></Card>
          </Show>
          <Show when={state() === "empty" || (state() === "ready" && visibleItems().length === 0)}>
            <Card><CardContent class="flex flex-col gap-3 p-6"><Type variant="h3">{props.emptyTitle ?? "No posts yet."}</Type><Type variant="body">{props.emptyBody ?? "Join a few communities to make this feed useful."}</Type><Button variant="secondary">Browse communities</Button></CardContent></Card>
          </Show>
          <Show when={(state() === "ready" || props.loadingMore) && visibleItems().length > 0}>
            <For each={visibleItems()}>
              {(item) => <FeedPost item={item} />}
            </For>
          </Show>
          <Show when={props.loadingMore}>
            <Card aria-live="polite"><CardContent class="flex flex-col gap-3 p-5"><div class="h-5 w-2/3 animate-pulse rounded-[var(--radius-sm)] bg-surface-skeleton" aria-hidden="true" /><div class="h-5 w-full animate-pulse rounded-[var(--radius-sm)] bg-surface-skeleton" aria-hidden="true" /><Type variant="caption">Loading more posts…</Type></CardContent></Card>
          </Show>
          <Show when={props.showPagination && page().nextCursor}>
            <Button onClick={loadMore} variant="secondary"><Type as="span" variant="label">Load more posts</Type></Button>
          </Show>
          <Show when={pageState() === "loading"}><Type variant="caption">Loading the next page…</Type></Show>
        </main>
        <Show when={props.asideTitle}>
          <aside><Card><CardContent class="flex flex-col gap-3 p-5"><Type variant="h3">{props.asideTitle}</Type><Type variant="body">Your spaces and community filters stay beside the feed on wide screens.</Type><Button variant="secondary"><Type as="span" variant="label">Open rail</Type></Button></CardContent></Card></aside>
        </Show>
      </div>
    </div>
  );
}

function FeedPost(props: { item: FeedItem }) {
  const item = () => props.item;
  return (
    <Card>
      <CardContent class="flex flex-col gap-3 p-5">
        <div class="flex flex-wrap items-center gap-2"><Type variant="label">{item().author}</Type><Type variant="caption">in c/{item().community} · {item().publishedAt.slice(0, 10)}</Type><Show when={item().publishState !== "published"}><Type variant="caption">{item().publishState}</Type></Show></div>
        <Type variant="h3">{item().title}</Type>
        <Type variant="body">{item().body}</Type>
        <div class="flex flex-wrap items-center justify-between gap-3"><Type variant="caption">{item().score} points · {item().media ?? "text"} · {feedTranslationLabel(item())}</Type><Button variant="ghost"><Type as="span" variant="label">Open post</Type></Button></div>
      </CardContent>
    </Card>
  );
}

const meta = {
  title: "Compositions/Posts/Feed",
  component: FeedBoard,
  args: { items: homeItems },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeMixed: Story = { render: () => <FeedBoard items={homeItems} showPagination /> };

export const HomeRecentPostsRail: Story = { render: () => <FeedBoard asideTitle="Recent posts" items={homeItems} /> };

export const HomeLongTextPreview: Story = { name: "Home / Long Text Preview", render: () => <FeedBoard items={[homeItems[2]!, { ...homeItems[1]!, body: communityItems[0]!.body }]} /> };

export const HomeLoadingMore: Story = { render: () => <FeedBoard items={[...homeItems, ...communityItems]} loadingMore showPagination /> };

export const HomeEmpty: Story = { render: () => <FeedBoard emptyBody="The communities you follow have not posted anything recently." emptyTitle="No posts in your home feed yet." items={[]} state="empty" /> };

export const YourCommunitiesEmpty: Story = { render: () => <FeedBoard emptyBody="Join a few communities or start one to make this feed useful." emptyTitle="No posts yet." items={[]} state="empty" /> };

export const CommunityWithFlairFilter: Story = { render: () => <FeedBoard asideTitle="Community" community="tame-impala" items={communityItems} showFlairFilter showPagination /> };

export const CommunityLongTextPreview: Story = { name: "Community / Long Text Preview", render: () => <FeedBoard asideTitle="Community" community="tame-impala" items={[communityItems[0]!]} /> };

export const MixedTranslatedAndOriginal: Story = { render: () => <FeedBoard items={[homeItems[2]!, communityItems[1]!]} /> };

export const MixedPublishStates: Story = { name: "Community / Mixed Publish States", render: () => <FeedBoard asideTitle="Community" community="tame-impala" items={communityItems} paginationError showFlairFilter /> };

export const HomeViewportPreset: Story = { name: "Home (viewport preset)", parameters: { viewport: { defaultViewport: "mobile1" } }, render: () => <FeedBoard items={homeItems} mobile /> };

export const CommunityViewportPreset: Story = { name: "Community (viewport preset)", parameters: { viewport: { defaultViewport: "mobile1" } }, render: () => <FeedBoard community="tame-impala" items={communityItems} mobile showFlairFilter /> };

export const YourCommunitiesMixed: Story = { render: () => <FeedBoard asideTitle="Your spaces" items={yourCommunitiesItems} showPagination /> };
