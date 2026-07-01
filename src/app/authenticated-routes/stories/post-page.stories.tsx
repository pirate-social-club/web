import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { SlidersHorizontal } from "@phosphor-icons/react";

import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import type { CommunitySidebarProps } from "@/components/compositions/community/sidebar/community-sidebar.types";
import { PostEventStoreLink } from "@/components/compositions/posts/post-event-store-link";
import { LiveRoomViewerModal } from "@/components/compositions/posts/live-room-viewer/live-room-viewer-modal";
import { PostThread } from "@/components/compositions/posts/post-thread/post-thread";
import type { CommentSort, PostThreadComment } from "@/components/compositions/posts/post-thread/post-thread.types";
import type { LiveRoomContentSpec, PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { IconButton } from "@/components/primitives/icon-button";
import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";

const noop = () => {};

const commentSortOptions: Array<{ label: string; value: CommentSort }> = [
  { label: "Best", value: "best" },
  { label: "New", value: "new" },
  { label: "Top", value: "top" },
];

const sidebarProps: CommunitySidebarProps = {
  avatarSrc: "https://i.pravatar.cc/160?img=10",
  communityId: "cmt_tameimpala",
  createdAt: "2026-04-17T00:00:00Z",
  description: "Studio dispatches, set notes, and live sessions for Tame Impala listeners.",
  displayName: "Tame Impala",
  followerCount: 18400,
  memberCount: 1270,
  membershipMode: "gated",
  store: {
    label: "Band store",
    url: "https://psc-zim-shop.fourthwall.com/",
  },
  moderators: [
    {
      displayName: "Kevin Parker",
      handle: "kevin.tameimpala",
      role: "owner",
      user: "usr_kevin",
    },
  ],
  requirementsMode: "all",
  gates: [
    { gateType: "wallet_score", label: "Passport score 8+", status: "met" },
    { gateType: "unique_human", label: "Human verification", provider: "self", status: "unknown" },
  ],
  rules: [
    {
      body: "Keep live-room posts focused on the event, setlist, recording quality, or access help.",
      position: 1,
      ruleId: "rule_event_threads",
      status: "active",
      title: "Stay on the set",
    },
    {
      body: "Do not repost paid links or recordings outside the room.",
      position: 2,
      ruleId: "rule_no_reuploads",
      status: "active",
      title: "Respect room access",
    },
  ],
};

const baseLiveRoom: LiveRoomContentSpec = {
  type: "live_room",
  liveRoomId: "lr_friday_night_set",
  title: "Friday Night Studio Set",
  roomKind: "solo",
  status: "scheduled",
  accessMode: "free",
  visibility: "public",
  accessState: "waiting",
  replayStatus: "none",
  startsAtLabel: "in 2h",
  anchorPostHref: "/p/pst_friday_night_set",
  setlistPreview: [
    { artist: "Tame Impala", rightsStatus: "ready", title: "Midnight Waves" },
    { artist: "Tame Impala", rightsStatus: "ready", title: "Echoes" },
    { artist: "Tame Impala", rightsStatus: "pending", title: "After Hours" },
  ],
};

const inlineViewerAttachResponse: ApiLiveRoomViewerAttachResponse = {
  room: {
    id: "lr_friday_night_set",
    object: "live_room",
    community: "cmt_tameimpala",
    anchor_post: "pst_friday_night_set",
    host_user: "usr_kevin",
    guest_user: null,
    room_kind: "solo",
    status: "live",
    access_mode: "free",
    visibility: "public",
    title: "Friday Night Studio Set",
    description: null,
    cover_ref: null,
    event_start_at: null,
    live_started_at: 1779047801,
    ended_at: null,
    canceled_at: null,
    broadcast_ref: "cmt_tameimpala:lr_friday_night_set",
    replay_status: "none",
    performer_allocations: [],
    setlist: {
      id: "lrs_friday_night_set",
      object: "live_room_setlist",
      status: "ready",
      items: [],
    },
    created: 1779041451,
  },
  access: {
    allowed: true,
    decision_reason: "allowed",
    access_mode: "free",
    visibility: "public",
    listing: null,
    purchase_entitlement: null,
    guest_invite_status: null,
  },
  runtime: {
    status: "attached",
    seat: "viewer",
    room_runtime_id: "cmt_tameimpala:lr_friday_night_set",
  },
  agora: {
    app_id: null,
    channel: "pirate-live-lr_friday_night_set",
    uid: 1607854678,
    token: null,
    token_expires_at: null,
    configured: false,
  },
};

const comments: PostThreadComment[] = [
  {
    authorLabel: "u/synthline",
    authorHref: "#",
    body: "Will this stay up as a replay after the Q&A? The setlist preview looks good.",
    commentId: "comment_1",
    replyActionLabel: "Reply",
    replyPlaceholder: "Write a reply",
    scoreLabel: "84 score",
    submitReplyLabel: "Reply",
    timestampLabel: "22m",
    viewerVote: null,
    children: [
      {
        authorCommunityRole: "moderator",
        authorLabel: "u/modmatrix.pirate",
        authorHref: "#",
        body: "The host said the replay will stay attached to this post once the room ends.",
        commentId: "comment_1_1",
        replyActionLabel: "Reply",
        replyPlaceholder: "Write a reply",
        scoreLabel: "31 score",
        submitReplyLabel: "Reply",
        timestampLabel: "18m",
        viewerVote: "up",
      },
    ],
  },
  {
    authorLabel: "u/dialsanddrums",
    authorHref: "#",
    body: "Ticket purchase worked from mobile. Waiting for the broadcast link to unlock.",
    commentId: "comment_2",
    replyActionLabel: "Reply",
    replyPlaceholder: "Write a reply",
    scoreLabel: "53 score",
    submitReplyLabel: "Reply",
    timestampLabel: "15m",
    viewerVote: null,
  },
];

function buildPost(liveRoom: LiveRoomContentSpec): PostCardProps {
  return {
    authorCommunityRole: "owner",
    byline: {
      author: { href: "#", kind: "user", label: "u/kevin.tameimpala" },
      community: {
        avatarSrc: "https://i.pravatar.cc/100?img=10",
        href: "#",
        kind: "community",
        label: "c/tameimpala",
      },
      timestampLabel: "5h",
    },
    content: liveRoom,
    engagement: { commentCount: 63, score: 891, viewerVote: null },
    identityPresentation: "author_with_community",
    viewContext: "post",
  };
}

type EventPostPageStoryProps = {
  eventStore?: { label: string; url: string } | null;
  liveRoom?: LiveRoomContentSpec;
  mobile?: boolean;
  modalOpen?: boolean;
};

function SortAction({
  onSortChange,
  sort,
}: {
  onSortChange: (sort: CommentSort) => void;
  sort: CommentSort;
}) {
  return (
    <ResponsiveOptionSelect
      ariaLabel="Sort comments"
      drawerTitle="Comments"
      mobileTrigger={(
        <IconButton aria-label="Sort comments" variant="ghost">
          <SlidersHorizontal className="size-6" weight="bold" />
        </IconButton>
      )}
      onValueChange={onSortChange}
      options={commentSortOptions}
      value={sort}
    />
  );
}

function EventPostPageStory({
  eventStore = {
    label: "Event merch",
    url: "https://psc-zim-shop.fourthwall.com/",
  },
  liveRoom = baseLiveRoom,
  mobile = false,
  modalOpen = false,
}: EventPostPageStoryProps) {
  const [sort, setSort] = React.useState<CommentSort>("best");
  const [rsvped, setRsvped] = React.useState(liveRoom.rsvpState === "going");
  const [viewerOpen, setViewerOpen] = React.useState(modalOpen);
  React.useEffect(() => {
    setRsvped(liveRoom.rsvpState === "going");
  }, [liveRoom.liveRoomId, liveRoom.rsvpState]);
  const canRsvp = liveRoom.status === "scheduled"
    && liveRoom.accessMode === "free"
    && !liveRoom.producerRole;
  const liveRoomContent: LiveRoomContentSpec = {
    ...liveRoom,
    onBuy: liveRoom.onBuy ?? noop,
    onRsvp: liveRoom.onRsvp ?? (canRsvp ? () => setRsvped(true) : undefined),
    onWatch: liveRoom.onWatch ?? (() => setViewerOpen(true)),
    rsvpState: liveRoom.rsvpState ?? (rsvped ? "going" : "none"),
  };
  const post = buildPost(liveRoomContent);
  const body = (
    <>
      <LiveRoomViewerModal
        attachResponse={null}
        onOpenChange={setViewerOpen}
        open={viewerOpen}
        title={liveRoom.title}
      />
      <ContentRailShell
        rail={!mobile ? (
          <div className="flex flex-col gap-3">
            {eventStore ? (
              <PostEventStoreLink
                communityId="cmt_tameimpala"
                label={eventStore.label}
                liveRoomId={liveRoom.liveRoomId}
                postId="pst_friday_night_set"
                url={eventStore.url}
              />
            ) : null}
            <CommunitySidebar {...sidebarProps} />
          </div>
        ) : undefined}
        reserveRail={!mobile}
      >
        {mobile && eventStore ? (
          <PostEventStoreLink
            className="mx-3 mb-3"
            communityId="cmt_tameimpala"
            label={eventStore.label}
            liveRoomId={liveRoom.liveRoomId}
            postId="pst_friday_night_set"
            url={eventStore.url}
          />
        ) : null}
        <PostThread
          availableCommentSorts={commentSortOptions}
          commentSort={sort}
          comments={comments}
          commentsHeading="Comments"
          emptyCommentsLabel="No comments yet"
          onCommentSortChange={setSort}
          onRootReplySubmit={() => "submitted"}
          post={post}
          rootReplyActionLabel="Reply"
          rootReplyCancelLabel="Cancel"
          rootReplyPlaceholder="Write a reply"
          rootReplySubmitLabel="Reply"
        />
      </ContentRailShell>
    </>
  );

  if (mobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={noop}
          title="Post"
          trailingAction={<SortAction onSortChange={setSort} sort={sort} />}
        />
        <section className="min-w-0 flex-1 px-0 pt-[calc(env(safe-area-inset-top)+4rem)]">
          {body}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      {body}
    </div>
  );
}

const meta = {
  title: "App/Routes/PostPage",
  component: EventPostPageStory,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof EventPostPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ScheduledEvent: Story = {
  name: "Scheduled event",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      attendeeCountLabel: "342 going",
      setlistTotalCount: 18,
      setlistHref: "#",
    },
  },
};

export const LiveAllowed: Story = {
  name: "Live / Viewer allowed",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "allowed",
      attendeeCountLabel: "1.2k watching",
      liveSinceLabel: "12m",
      status: "live",
    },
  },
};

export const LiveInlineViewer: Story = {
  name: "Live / Inline viewer",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "allowed",
      attendeeCountLabel: "1.2k watching",
      hasEntitlement: true,
      liveSinceLabel: "12m",
      status: "live",
      viewerAttachResponse: inlineViewerAttachResponse,
    },
  },
};

export const PaidNeedsTicket: Story = {
  name: "Paid / Needs ticket",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessMode: "paid",
      accessState: "purchase_required",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$12.00",
    },
  },
};

export const PaidHasTicket: Story = {
  name: "Paid / Has ticket",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessMode: "paid",
      hasEntitlement: true,
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$12.00",
    },
  },
};

export const HostBroadcast: Story = {
  name: "Host / In Freedom",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      freedomDetected: true,
      freedomHref: "freedom://live-room?roomId=lr_friday_night_set&communityId=cmt_tameimpala&apiBase=https%3A%2F%2Fapi-staging.pirate.sc&webBase=https%3A%2F%2Fstaging.pirate.sc&seat=host",
      producerRole: "host",
    },
  },
};

export const HostNotInFreedom: Story = {
  name: "Host / Not in Freedom",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      freedomDetected: false,
      producerRole: "host",
    },
  },
};

export const HostDetectionMissing: Story = {
  name: "Host / Detection missing",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      freedomDetected: false,
      freedomHref: "freedom://live-room?roomId=lr_friday_night_set&communityId=cmt_tameimpala&apiBase=https%3A%2F%2Fapi-staging.pirate.sc&webBase=https%3A%2F%2Fstaging.pirate.sc&seat=host",
      producerRole: "host",
    },
  },
};

export const EndedReplayPublished: Story = {
  name: "Ended / Replay published",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayDurationLabel: "48 min",
      replayStatus: "published",
      status: "ended",
    },
  },
};

export const EndedReplayPublishedPaidNeedsTicket: Story = {
  name: "Ended / Replay published paid locked",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessMode: "paid",
      accessState: "ended",
      endedAtLabel: "1h",
      hasEntitlement: false,
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$12.00",
      replayDurationLabel: "48 min",
      replayStatus: "published",
      status: "ended",
    },
  },
};

export const EndedReplayProcessing: Story = {
  name: "Ended / Replay processing",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayDurationLabel: "48 min",
      replayStatus: "processing",
      status: "ended",
    },
  },
};

export const EndedReplayUnderReview: Story = {
  name: "Ended / Replay under review",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayDurationLabel: "48 min",
      replayStatus: "review_pending",
      status: "ended",
    },
  },
};

export const EndedReplayFailed: Story = {
  name: "Ended / Replay failed",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayDurationLabel: "48 min",
      replayStatus: "failed",
      status: "ended",
    },
  },
};

export const EndedNoReplay: Story = {
  name: "Ended / No replay",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayStatus: "none",
      status: "ended",
    },
  },
};

export const MobileScheduled: Story = {
  name: "Mobile / Scheduled event",
  args: {
    mobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const DuetWithGuest: Story = {
  name: "Participants / Duet with guest",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      roomKind: "duet",
      title: "Late set with a guest",
      participants: [
        { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
        { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
      ],
    },
  },
};

export const MultiPerformer: Story = {
  name: "Participants / Multi-performer",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      roomKind: "duet",
      title: "Sunday jam session",
      participants: [
        { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
        { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
        { role: "guest", label: "domSimmons.pirate", href: "/u/domSimmons.pirate", avatarSrc: "https://i.pravatar.cc/100?img=13" },
        { role: "guest", label: "amhood.pirate", href: "/u/amhood.pirate" },
      ],
    },
  },
};
