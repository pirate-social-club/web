import "@/test/setup-runtime";

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { VideoExperienceSeed } from "@/app/video-experience/video-experience-context";
import { useVideoExperience } from "@/app/video-experience/video-experience-context";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

type TestSession = { accessToken: string; user: { id: string } } | null;

// Mutable harness state. The mocked modules below read these at call time, so
// tests can switch accounts, steer API promises, and capture rendered props.
let currentSession: TestSession;
let latestVideoFeedProps: Record<string, any> | null;
let latestCommentsPanelProps: Record<string, any> | null;
let analyticsEvents: Record<string, any>[];
let postsGetImpl: (postId: string, options: unknown) => Promise<any>;
let postsVoteImpl: () => Promise<void>;
let gatedActionImpl: (args: any) => void;

const DEFAULT_POST_RESPONSE = {
  community: { id: "com_1", viewer_community_role: null, viewer_membership_status: null },
  post: { author_user: null, community: "com_1", identity_mode: "anonymous" },
};

// One ranked entry keeps the initial-feed effect satisfied; an empty response
// would leave entries.length at 0 and the effect would refetch indefinitely.
const FAKE_FEED_ENTRY = {
  community: { id: "com_1" },
  post: { community: null, post: { author_user: null, id: "pst_ranked", identity_mode: "anonymous" } },
};

const fakeApi = {
  bookings: { listBookingSlots: async () => ({ slots: [] }) },
  feed: {
    publicVideos: async () => ({ items: [FAKE_FEED_ENTRY], next_cursor: null }),
    videos: async () => ({ items: [FAKE_FEED_ENTRY], next_cursor: null }),
  },
  posts: {
    clearVote: async () => {},
    get: (postId: string, options: unknown) => postsGetImpl(postId, options),
    vote: () => postsVoteImpl(),
  },
  publicPosts: {
    get: (postId: string, options: unknown) => postsGetImpl(postId, options),
  },
};

const testCopy = {
  common: {
    close: "Close",
    commentsHeading: "Comments",
    commentsHeadingWithCount: "Comments ({count})",
  },
  home: {
    videoPublisherJoin: "Join",
    videoPublisherJoinDescription: "Join {communityName}",
    videoPublisherJoined: "Joined",
  },
  profile: { bookSheetDescription: "Pick a slot", bookSheetTitle: "Book {handle}" },
};

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/api/session-store", () => ({ useSession: () => currentSession }));
mock.module("@/hooks/use-route-content-locale", () => ({ useRouteContentLocale: () => "en" }));
mock.module("@/hooks/use-route-messages", () => ({
  useRouteMessages: () => ({ copy: testCopy, localeTag: "en" }),
}));
mock.module("@/app/router", () => ({ navigate: () => {} }));
mock.module("@/lib/analytics", () => ({
  trackAnalyticsEvent: (event: Record<string, any>) => {
    analyticsEvents.push(event);
  },
}));
mock.module("@/lib/route-messages", () => ({ interpolateMessage: (text: string) => text }));
mock.module("@/lib/video-feed-lead-rotation", () => ({
  recordSessionSeenVideoIds: () => {},
  takeUnseenSessionVideos: (items: unknown[]) => items,
}));
mock.module("@/lib/video-impression-analytics", () => ({
  videoImpressionAnalyticsProperties: () => ({}),
}));
mock.module("@/app/authenticated-data/community-data", () => ({
  loadProfilesByUserId: async () => ({}),
}));
mock.module("@/app/authenticated-helpers/post-presentation", () => ({
  toHomeFeedItem: () => null,
  toThreadPostCard: () => null,
}));
mock.module("@/app/authenticated-helpers/use-video-viewer-song-capabilities", () => ({
  useVideoViewerSongCapabilities: () => ({ cacheScope: "test", load: async () => null }),
}));
mock.module("@/app/authenticated-helpers/video-viewer-return-state", () => ({
  currentRelativePath: () => "/",
  saveVideoViewerReturnState: () => {},
}));
mock.module("@/app/authenticated-routes/feed-comments-panel", () => ({
  FeedCommentsPanel: (props: Record<string, any>) => {
    latestCommentsPanelProps = props;
    return null;
  },
}));
mock.module("@/hooks/use-community-interaction-gate", () => ({
  useCommunityInteractionGate: () => ({
    gateModal: null,
    runGatedCommunityAction: (args: any) => gatedActionImpl(args),
  }),
}));
mock.module("@/hooks/use-community-interaction-gate.helpers", () => ({
  createDefaultBlockedModalState: () => ({}),
  selectPostVoteGateData: () => null,
}));
mock.module("@/components/compositions/posts/video-feed/video-feed", () => ({
  compactCount: (count: number) => String(count),
  VideoFeed: (props: Record<string, any>) => {
    latestVideoFeedProps = props;
    return null;
  },
}));
mock.module("@/components/compositions/posts/video-feed/video-viewer-item", () => ({
  adjacentVideoSourcePostIds: () => [],
  toVideoViewerItem: () => null,
}));
mock.module("@/components/compositions/posts/feed-side-panel/feed-side-panel", () => ({
  FeedPanelLayout: ({ children, panel }: { children?: unknown; panel?: unknown }) => (
    <>{children}{panel}</>
  ),
  FeedSidePanel: ({ children }: { children?: unknown }) => children,
}));
mock.module("@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet", () => ({
  FeedBookingSheetBody: () => null,
  formatFeedBookingTitle: (title: string) => title,
}));
mock.module("@/components/primitives/dialog", () => ({
  Dialog: ({ children }: { children?: unknown }) => children,
  DialogContent: ({ children }: { children?: unknown }) => children,
  DialogTitle: () => null,
}));
mock.module("@/components/primitives/sonner", () => ({
  toast: { error: () => {}, success: () => {} },
}));
mock.module("@/components/primitives/spinner", () => ({ Spinner: () => null }));

// The DOM shim's location is a static partial without href/history; the
// provider synchronizes with both, so give tests functional stand-ins.
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    hostname: "localhost",
    href: "http://localhost/",
    origin: "http://localhost",
    pathname: "/",
    search: "",
  },
});
Object.defineProperty(window, "history", {
  configurable: true,
  value: { back: () => {}, pushState: () => {}, replaceState: () => {}, state: null },
});

// Imported after the mocks so the provider binds to them.
import { GlobalVideoExperienceProvider } from "./video-experience-provider";
import { VideoExperienceOverlay } from "./video-experience-overlay";

let capturedOpenVideo: ((seed: VideoExperienceSeed) => void) | null = null;

function OpenVideoCapture() {
  const experience = useVideoExperience();
  capturedOpenVideo = experience?.openVideo ?? null;
  return null;
}

function seedVideo(id: string, source: string): VideoExperienceSeed {
  return {
    item: {
      commentCount: 2,
      communityId: "com_1",
      id,
      karaoke: "unavailable",
      likeCount: 5,
      liked: false,
      media: { orientation: "portrait", src: `https://media.test/${id}.mp4` },
      publisher: {
        handle: "artist",
        kind: "community",
        relationship: { active: false, disabled: false, kind: "join", label: "Join" },
      },
      study: "unavailable",
    },
    source,
  };
}

function session(userId: string): TestSession {
  return { accessToken: `tok-${userId}`, user: { id: userId } };
}

function renderProvider(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <GlobalVideoExperienceProvider>
        <OpenVideoCapture />
      </GlobalVideoExperienceProvider>
    </QueryClientProvider>,
  );
}

function rerenderProvider(
  view: ReturnType<typeof render>,
  queryClient: QueryClient,
) {
  view.rerender(
    <QueryClientProvider client={queryClient}>
      <GlobalVideoExperienceProvider>
        <OpenVideoCapture />
      </GlobalVideoExperienceProvider>
    </QueryClientProvider>,
  );
}

function currentItem(): VideoFeedItem {
  if (!latestVideoFeedProps) throw new Error("VideoFeed has not rendered.");
  return latestVideoFeedProps.items[0] as VideoFeedItem;
}

async function openVideo(seed: VideoExperienceSeed) {
  await act(async () => {
    capturedOpenVideo?.(seed);
  });
  await waitFor(() => expect(latestVideoFeedProps).not.toBeNull());
}

beforeEach(() => {
  currentSession = session("user-a");
  latestVideoFeedProps = null;
  latestCommentsPanelProps = null;
  analyticsEvents = [];
  capturedOpenVideo = null;
  postsGetImpl = async () => DEFAULT_POST_RESPONSE;
  postsVoteImpl = async () => {};
  gatedActionImpl = (args) => {
    args.onAllowed?.();
  };
  Object.defineProperty(window.history, "state", { configurable: true, value: null, writable: true });
});

afterEach(cleanup);

describe("viewer identity boundary", () => {
  test("an account switch re-enables the Join action the previous account used", async () => {
    const queryClient = new QueryClient();
    const view = renderProvider(queryClient);
    await openVideo(seedVideo("pst_1", "explore"));

    expect(currentItem().publisher.relationship).toMatchObject({ active: false, kind: "join" });
    await act(async () => {
      latestVideoFeedProps?.onPublisherRelationship(currentItem());
    });
    expect(currentItem().publisher.relationship).toMatchObject({
      active: true,
      disabled: true,
      kind: "join",
      label: "Joined",
    });

    currentSession = session("user-b");
    await act(async () => {
      rerenderProvider(view, queryClient);
    });

    expect(currentItem().publisher.relationship).toMatchObject({
      active: false,
      disabled: false,
      kind: "join",
      label: "Join",
    });
  });

  test("an account switch drops the previous account's locally added comment counts", async () => {
    const queryClient = new QueryClient();
    const view = renderProvider(queryClient);
    await openVideo(seedVideo("pst_1", "explore"));

    await act(async () => {
      latestVideoFeedProps?.onActiveItemChange(currentItem(), 0);
    });
    await act(async () => {
      latestVideoFeedProps?.onComment(currentItem());
    });
    await act(async () => {
      latestCommentsPanelProps?.onCommentAdded("pst_1");
    });
    expect(currentItem().commentCount).toBe(3);

    currentSession = session("user-b");
    await act(async () => {
      rerenderProvider(view, queryClient);
    });

    expect(currentItem().commentCount).toBe(2);
  });

  test("an open viewer cannot retain the previous account's vote overrides", async () => {
    const queryClient = new QueryClient();
    const view = renderProvider(queryClient);
    await openVideo(seedVideo("pst_1", "explore"));

    await act(async () => {
      latestVideoFeedProps?.onLike(currentItem());
    });
    expect(currentItem()).toMatchObject({ likeCount: 6, liked: true });

    currentSession = session("user-b");
    await act(async () => {
      rerenderProvider(view, queryClient);
    });

    expect(currentItem()).toMatchObject({ likeCount: 5, liked: false });
  });
});

describe("viewer history restoration", () => {
  test("restores the comments panel when the lazy overlay remounts", async () => {
    const seed = seedVideo("pst_1", "explore");
    Object.defineProperty(window.history, "state", {
      configurable: true,
      value: { pirateGlobalVideoComments: { itemId: seed.item.id, postId: seed.item.id } },
      writable: true,
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <VideoExperienceOverlay request={{ id: 1, seed }} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(latestCommentsPanelProps?.postId).toBe(seed.item.id));
  });
});

describe("vote rollback", () => {
  test("reverses only vote-owned fields when enrichment lands mid-flight", async () => {
    let resolveEnrichment: (response: unknown) => void = () => {};
    let rejectVote: (error: Error) => void = () => {};
    postsGetImpl = () => new Promise((resolve) => {
      resolveEnrichment = resolve;
    });
    postsVoteImpl = () => new Promise((_, reject) => {
      rejectVote = reject;
    });

    const queryClient = new QueryClient();
    renderProvider(queryClient);
    await openVideo(seedVideo("pst_1", "explore"));

    // Vote while the relationship enrichment is still in flight.
    await act(async () => {
      latestVideoFeedProps?.onLike(currentItem());
    });
    expect(currentItem()).toMatchObject({ likeCount: 6, liked: true });

    await act(async () => {
      resolveEnrichment({
        community: { id: "com_enriched" },
        post: { author_user: null, community: "com_enriched", identity_mode: "anonymous" },
      });
    });
    expect(currentItem()).toMatchObject({ communityId: "com_enriched", liked: true });

    await act(async () => {
      rejectVote(new Error("Vote failed."));
    });

    expect(currentItem()).toMatchObject({
      communityId: "com_enriched",
      likeCount: 5,
      liked: false,
    });
  });
});

describe("viewer analytics", () => {
  test("reports the current seed's source after a different video opens", async () => {
    const queryClient = new QueryClient();
    renderProvider(queryClient);
    await openVideo(seedVideo("pst_a", "explore"));
    await openVideo(seedVideo("pst_b", "community"));

    await act(async () => {
      latestVideoFeedProps?.onComment(currentItem());
    });

    const opened = analyticsEvents.filter((event) => event.eventName === "video_viewer_opened");
    expect(opened.map((event) => event.properties.source_surface)).toEqual(["explore", "community"]);
    const selected = analyticsEvents.filter((event) => event.eventName === "video_capability_selected");
    expect(selected.at(-1)).toMatchObject({
      postId: "pst_b",
      properties: { capability: "comments", source_surface: "community" },
    });
  });
});
