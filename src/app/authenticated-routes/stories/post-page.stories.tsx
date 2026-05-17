import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { SlidersHorizontal } from "@phosphor-icons/react";

import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import type { CommunitySidebarProps } from "@/components/compositions/community/sidebar/community-sidebar.types";
import { LiveRoomViewerModal } from "@/components/compositions/posts/live-room-viewer/live-room-viewer-modal";
import { PostThread } from "@/components/compositions/posts/post-thread/post-thread";
import type { CommentSort, PostThreadComment } from "@/components/compositions/posts/post-thread/post-thread.types";
import type { LiveRoomContentSpec, PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { IconButton } from "@/components/primitives/icon-button";

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

const coverSrc = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=960&h=540&fit=crop&crop=entropy&q=80";

const baseLiveRoom: LiveRoomContentSpec = {
  type: "live_room",
  liveRoomId: "lr_friday_night_set",
  title: "Friday Night Studio Set",
  description: "A live run through the new material with a short Q&A after the set.",
  coverSrc,
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
        rail={!mobile ? <CommunitySidebar {...sidebarProps} /> : undefined}
        reserveRail={!mobile}
      >
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
      freedomHref: "freedom://live-room?roomId=lr_friday_night_set&communityId=cmt_tameimpala&apiBase=https%3A%2F%2Fapi.pirate.local",
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
      freedomHref: "freedom://live-room?roomId=lr_friday_night_set&communityId=cmt_tameimpala&apiBase=https%3A%2F%2Fapi.pirate.local",
      producerRole: "host",
    },
  },
};

export const EndedReplayReady: Story = {
  name: "Ended / Replay ready",
  args: {
    liveRoom: {
      ...baseLiveRoom,
      accessState: "ended",
      endedAtLabel: "1h",
      replayStatus: "ready",
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
      replayStatus: "processing",
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
